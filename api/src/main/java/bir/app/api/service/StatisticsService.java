package bir.app.api.service;

import bir.app.api.dto.StatsOverviewResponse;
import bir.app.api.entity.AppUser;
import bir.app.api.entity.MockExamAttemptItem;
import bir.app.api.entity.SessionItem;
import bir.app.api.repository.FreeSessionRepository;
import bir.app.api.repository.MockExamAttemptItemRepository;
import bir.app.api.repository.MockExamAttemptRepository;
import bir.app.api.repository.QuestionRepository;
import bir.app.api.repository.SessionItemRepository;
import bir.app.api.support.QuestionTextNormalizer;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Estadísticas de práctica combinando el modo libre y los simulacros entregados.
 *
 * <p>El desglose por categoría incluye todas las categorías del banco, aunque
 * todavía no se haya respondido nada en ellas: así el usuario ve qué le queda
 * por practicar. La vista global (todos los usuarios) solo se calcula para
 * ADMIN y CREATOR.</p>
 */
@Singleton
public class StatisticsService {

    /** Categoría de las preguntas sin categoría. */
    static final String NO_CATEGORY = "Sin categoría";
    /** Clave que ordena el bucket sin categoría al final. */
    private static final String NO_CATEGORY_KEY = "\uffff";

    private final FreeSessionRepository freeSessionRepository;
    private final SessionItemRepository sessionItemRepository;
    private final MockExamAttemptRepository mockExamAttemptRepository;
    private final MockExamAttemptItemRepository mockExamAttemptItemRepository;
    private final QuestionRepository questionRepository;
    private final AccessControlService accessControlService;

    public StatisticsService(FreeSessionRepository freeSessionRepository,
                             SessionItemRepository sessionItemRepository,
                             MockExamAttemptRepository mockExamAttemptRepository,
                             MockExamAttemptItemRepository mockExamAttemptItemRepository,
                             QuestionRepository questionRepository,
                             AccessControlService accessControlService) {
        this.freeSessionRepository = freeSessionRepository;
        this.sessionItemRepository = sessionItemRepository;
        this.mockExamAttemptRepository = mockExamAttemptRepository;
        this.mockExamAttemptItemRepository = mockExamAttemptItemRepository;
        this.questionRepository = questionRepository;
        this.accessControlService = accessControlService;
    }

    @Transactional
    public StatsOverviewResponse overview(String username) {
        List<SessionItem> freeAnswered = sessionItemRepository.findAnsweredByUsername(username);
        List<MockExamAttemptItem> mockAnswered = finishedOnly(
                mockExamAttemptItemRepository.findAnsweredFinishedByUsername(username));

        long freeSessions = freeSessionRepository.countByUserUsername(username);
        long mockAttempts = mockExamAttemptRepository.countFinishedByUsername(username);
        long answered = freeAnswered.size() + mockAnswered.size();
        long correct = countCorrect(freeAnswered) + countCorrectMock(mockAnswered);

        StatsOverviewResponse.Summary mine = new StatsOverviewResponse.Summary(
                freeSessions,
                mockAttempts,
                answered,
                correct,
                pct(correct, answered),
                byCategory(freeAnswered, mockAnswered, myBankCategories(username)));

        StatsOverviewResponse.Global global = null;
        if (accessControlService.hasGlobalBankAccess(username)) {
            List<SessionItem> allFree = sessionItemRepository.findAllAnswered();
            List<MockExamAttemptItem> allMock = finishedOnly(
                    mockExamAttemptItemRepository.findAllAnsweredFinished());
            long globalAnswered = allFree.size() + allMock.size();
            long globalCorrect = countCorrect(allFree) + countCorrectMock(allMock);
            List<StatsOverviewResponse.UserStats> byUser = byUser(allFree, allMock);

            global = new StatsOverviewResponse.Global(
                    byUser.size(),
                    freeSessionRepository.count(),
                    mockExamAttemptRepository.countFinished(),
                    globalAnswered,
                    globalCorrect,
                    pct(globalCorrect, globalAnswered),
                    byCategory(allFree, allMock, questionRepository.findDistinctCategories()),
                    byUser);
        }

        return new StatsOverviewResponse(mine, global);
    }

    // --- Desglose por categoría ----------------------------------------------

    private List<String> myBankCategories(String username) {
        if (accessControlService.hasGlobalBankAccess(username)) {
            return questionRepository.findDistinctCategories();
        }
        Set<String> allowed = accessControlService.allowedBankCodes(username);
        if (allowed.isEmpty()) {
            return List.of();
        }
        return questionRepository.findDistinctCategoriesByExamTypeCodeIn(allowed);
    }

    private static List<StatsOverviewResponse.CategoryStats> byCategory(
            List<SessionItem> freeAnswered,
            List<MockExamAttemptItem> mockAnswered,
            List<String> baseCategories) {

        Map<String, CategoryAcc> acc = new LinkedHashMap<>();
        for (String category : baseCategories) {
            acc.computeIfAbsent(categoryKey(category), k -> new CategoryAcc(categoryDisplay(category)));
        }
        for (SessionItem item : freeAnswered) {
            String category = item.getQuestion() == null ? null : item.getQuestion().getCategory();
            add(acc, category, Boolean.TRUE.equals(item.getIsCorrect()));
        }
        for (MockExamAttemptItem item : mockAnswered) {
            add(acc, item.getCategory(), Boolean.TRUE.equals(item.getIsCorrect()));
        }

        return acc.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    CategoryAcc acc2 = entry.getValue();
                    return new StatsOverviewResponse.CategoryStats(
                            acc2.display,
                            acc2.answered,
                            acc2.correct,
                            pct(acc2.correct, acc2.answered));
                })
                .toList();
    }

    private static void add(Map<String, CategoryAcc> acc, String category, boolean correct) {
        acc.computeIfAbsent(categoryKey(category), k -> new CategoryAcc(categoryDisplay(category)))
                .add(correct);
    }

    private static String categoryKey(String category) {
        String normalized = QuestionTextNormalizer.normalize(category);
        return normalized.isEmpty() ? NO_CATEGORY_KEY : normalized;
    }

    private static String categoryDisplay(String category) {
        return category == null || category.isBlank() ? NO_CATEGORY : category.trim();
    }

    // --- Desglose por usuario (vista global) ---------------------------------

    private static List<StatsOverviewResponse.UserStats> byUser(
            List<SessionItem> freeAnswered,
            List<MockExamAttemptItem> mockAnswered) {

        Map<String, UserAcc> acc = new LinkedHashMap<>();
        for (SessionItem item : freeAnswered) {
            addUser(acc, item.getSession().getUser(), Boolean.TRUE.equals(item.getIsCorrect()));
        }
        for (MockExamAttemptItem item : mockAnswered) {
            addUser(acc, item.getAttempt().getUser(), Boolean.TRUE.equals(item.getIsCorrect()));
        }

        return acc.values().stream()
                .sorted(Comparator.comparingLong(UserAcc::answered).reversed()
                        .thenComparing(UserAcc::displayName, String.CASE_INSENSITIVE_ORDER))
                .map(user -> new StatsOverviewResponse.UserStats(
                        user.username,
                        user.displayName,
                        user.answered,
                        user.correct,
                        pct(user.correct, user.answered)))
                .toList();
    }

    private static void addUser(Map<String, UserAcc> acc, AppUser user, boolean correct) {
        if (user == null || user.getUsername() == null) {
            return;
        }
        acc.computeIfAbsent(user.getUsername(), k -> new UserAcc(user))
                .add(correct);
    }

    // --- Helpers -------------------------------------------------------------

    private static List<MockExamAttemptItem> finishedOnly(List<MockExamAttemptItem> items) {
        return items.stream()
                .filter(item -> item.getAttempt() != null && item.getAttempt().isFinished())
                .toList();
    }

    private static long countCorrect(List<SessionItem> items) {
        return items.stream().filter(item -> Boolean.TRUE.equals(item.getIsCorrect())).count();
    }

    private static long countCorrectMock(List<MockExamAttemptItem> items) {
        return items.stream().filter(item -> Boolean.TRUE.equals(item.getIsCorrect())).count();
    }

    private static double pct(long correct, long answered) {
        return answered == 0 ? 0d : Math.round((double) correct * 1000 / answered) / 10d;
    }

    private static final class CategoryAcc {
        private final String display;
        private long answered;
        private long correct;

        private CategoryAcc(String display) {
            this.display = display;
        }

        private void add(boolean isCorrect) {
            answered++;
            if (isCorrect) {
                correct++;
            }
        }
    }

    private static final class UserAcc {
        private final String username;
        private final String displayName;
        private long answered;
        private long correct;

        private UserAcc(AppUser user) {
            this.username = user.getUsername();
            this.displayName = user.getDisplayName() == null || user.getDisplayName().isBlank()
                    ? user.getUsername()
                    : user.getDisplayName();
        }

        private String displayName() {
            return displayName;
        }

        private long answered() {
            return answered;
        }

        private void add(boolean isCorrect) {
            answered++;
            if (isCorrect) {
                correct++;
            }
        }
    }
}
