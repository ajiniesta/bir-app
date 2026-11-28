package bir.app.api.service;

import bir.app.api.dto.AnswerRequest;
import bir.app.api.dto.CreateReviewSessionRequest;
import bir.app.api.dto.FreeSessionResponse;
import bir.app.api.dto.ReviewFiltersResponse;
import bir.app.api.dto.ReviewSessionResponse;
import bir.app.api.dto.ReviewSessionSummaryResponse;
import bir.app.api.dto.StatsOverviewResponse;
import bir.app.api.entity.AnswerOption;
import bir.app.api.entity.AppUser;
import bir.app.api.entity.ExamType;
import bir.app.api.entity.Question;
import bir.app.api.entity.QuestionLearningStatus;
import bir.app.api.entity.ReviewSession;
import bir.app.api.entity.ReviewSessionItem;
import bir.app.api.exception.ForbiddenException;
import bir.app.api.repository.ExamTypeRepository;
import bir.app.api.repository.QuestionRepository;
import bir.app.api.repository.ReviewSessionRepository;
import bir.app.api.support.QuestionTagSupport;
import bir.app.api.support.QuestionTextNormalizer;
import io.micronaut.core.annotation.Nullable;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Lógica del "modo repaso": permite practicar preguntas de un banco filtradas
 * por una o varias categorías y uno o varios tags, sin límite de preguntas,
 * pudiendo retomarse más adelante y finalizar cuando el usuario lo decida.
 */
@Singleton
public class ReviewSessionService {

    static final String NO_CATEGORY = "Sin categoría";
    private static final String NO_CATEGORY_KEY = "\uffff";

    private final ReviewSessionRepository reviewSessionRepository;
    private final QuestionRepository questionRepository;
    private final ExamTypeRepository examTypeRepository;
    private final AppUserService appUserService;
    private final AccessControlService accessControlService;
    private final UserQuestionStatusService userQuestionStatusService;

    public ReviewSessionService(ReviewSessionRepository reviewSessionRepository,
                                QuestionRepository questionRepository,
                                ExamTypeRepository examTypeRepository,
                                AppUserService appUserService,
                                AccessControlService accessControlService) {
        this(reviewSessionRepository, questionRepository, examTypeRepository,
                appUserService, accessControlService, null);
    }

    @Inject
    public ReviewSessionService(ReviewSessionRepository reviewSessionRepository,
                                QuestionRepository questionRepository,
                                ExamTypeRepository examTypeRepository,
                                AppUserService appUserService,
                                AccessControlService accessControlService,
                                @Nullable UserQuestionStatusService userQuestionStatusService) {
        this.reviewSessionRepository = reviewSessionRepository;
        this.questionRepository = questionRepository;
        this.examTypeRepository = examTypeRepository;
        this.appUserService = appUserService;
        this.accessControlService = accessControlService;
        this.userQuestionStatusService = userQuestionStatusService;
    }

    @Transactional
    public ReviewFiltersResponse filters(String username, String examTypeCode) {
        List<Question> questions;
        if (examTypeCode != null && !examTypeCode.isBlank()) {
            ExamType examType = resolveExamType(examTypeCode);
            if (!accessControlService.hasGlobalBankAccess(username)) {
                Set<String> allowed = accessControlService.allowedBankCodes(username);
                if (!allowed.contains(examType.getCode())) {
                    throw new ForbiddenException("No tienes acceso al banco de preguntas: " + examType.getCode());
                }
            }
            questions = questionRepository.findByExamTypeCode(examType.getCode());
        } else if (accessControlService.hasGlobalBankAccess(username)) {
            questions = questionRepository.findAll();
        } else {
            Set<String> allowed = accessControlService.allowedBankCodes(username);
            if (allowed.isEmpty()) {
                return new ReviewFiltersResponse(List.of(), List.of());
            }
            questions = questionRepository.findByExamTypeCodeIn(allowed);
        }

        Map<String, String> categoriesByKey = new LinkedHashMap<>();
        Map<String, String> tagsByKey = new LinkedHashMap<>();
        for (Question question : questions) {
            if (!hasCorrectOption(question)) {
                continue;
            }
            if (question.getCategory() != null && !question.getCategory().isBlank()) {
                String cat = question.getCategory().trim();
                categoriesByKey.putIfAbsent(cat.toLowerCase(Locale.ROOT), cat);
            }
            for (String tag : QuestionTagSupport.parse(question.getTag())) {
                tagsByKey.putIfAbsent(tag.toLowerCase(Locale.ROOT), tag);
            }
        }

        List<String> sortedCategories = categoriesByKey.values().stream()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
        List<String> sortedTags = tagsByKey.values().stream()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
        return new ReviewFiltersResponse(sortedCategories, sortedTags);
    }

    @Transactional
    public List<ReviewSessionSummaryResponse> listActive(String username) {
        List<ReviewSession> sessions = reviewSessionRepository.findActiveByUsername(username);
        List<ReviewSessionSummaryResponse> result = new ArrayList<>(sessions.size());
        for (ReviewSession session : sessions) {
            List<String> categories = deserializeList(session.getCategories());
            List<String> tags = deserializeList(session.getTags());
            int answered = (int) session.getItems().stream().filter(ReviewSessionItem::isAnswered).count();
            int correct = (int) session.getItems().stream()
                    .filter(i -> i.isAnswered() && Boolean.TRUE.equals(i.getIsCorrect()))
                    .count();
            int totalMatching = Math.max(
                    loadMatchingPool(username, session.getExamType(), categories, tags,
                            session.isOnlyDoubt(), session.isOnlyFailed()).size(),
                    session.getItems().size());
            result.add(new ReviewSessionSummaryResponse(
                    session.getId(),
                    session.getExamType().getCode(),
                    session.getExamType().getName(),
                    categories,
                    tags,
                    session.isOnlyDoubt(),
                    session.isOnlyFailed(),
                    answered,
                    correct,
                    totalMatching,
                    session.getCreatedAt(),
                    session.isFinished()));
        }
        return result;
    }

    @Transactional
    public ReviewSessionResponse create(String username, CreateReviewSessionRequest request) {
        if (request == null || request.examTypeCode() == null || request.examTypeCode().isBlank()) {
            throw new IllegalArgumentException("El banco de preguntas es obligatorio");
        }
        AppUser user = appUserService.requireByUsername(username);
        ExamType examType = resolveExamType(request.examTypeCode());
        checkBankAccess(username, examType);

        List<String> categories = normalizeList(request.categories());
        List<String> tags = QuestionTagSupport.parse(null, request.tags());
        boolean onlyDoubt = Boolean.TRUE.equals(request.onlyDoubt());
        boolean onlyFailed = Boolean.TRUE.equals(request.onlyFailed());

        List<Question> pool = new ArrayList<>(
                loadMatchingPool(username, examType, categories, tags, onlyDoubt, onlyFailed));
        if (pool.isEmpty()) {
            throw new IllegalArgumentException("No hay preguntas que coincidan con el filtro seleccionado");
        }
        Collections.shuffle(pool);

        ReviewSession session = new ReviewSession();
        session.setUser(user);
        session.setExamType(examType);
        session.setCategories(serializeList(categories));
        session.setTags(serializeList(tags));
        session.setOnlyDoubt(onlyDoubt);
        session.setOnlyFailed(onlyFailed);

        ReviewSessionItem firstItem = new ReviewSessionItem();
        firstItem.setSession(session);
        firstItem.setQuestion(pool.get(0));
        firstItem.setPosition(1);
        session.getItems().add(firstItem);

        ReviewSession saved = reviewSessionRepository.save(session);
        return toResponse(saved, pool.size());
    }

    @Transactional
    public ReviewSessionResponse get(String username, Long sessionId) {
        ReviewSession session = requireSession(username, sessionId);
        List<String> categories = deserializeList(session.getCategories());
        List<String> tags = deserializeList(session.getTags());
        List<Question> pool = loadMatchingPool(
                username, session.getExamType(), categories, tags,
                session.isOnlyDoubt(), session.isOnlyFailed());

        if (!session.isFinished()
                && !session.getItems().isEmpty()
                && session.getItems().stream().allMatch(ReviewSessionItem::isAnswered)) {
            if (appendNextQuestionIfAvailable(session, pool)) {
                session = reviewSessionRepository.save(session);
            }
        }
        return toResponse(session, pool.size());
    }

    @Transactional
    public ReviewSessionResponse answer(String username, Long sessionId, AnswerRequest request) {
        ReviewSession session = requireSession(username, sessionId);
        if (session.isFinished()) {
            throw new IllegalArgumentException("El repaso ya ha finalizado");
        }

        ReviewSessionItem item = session.getItems().stream()
                .filter(i -> i.getPosition().equals(request.position()))
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException(
                        "Pregunta no encontrada en el repaso: " + request.position()));

        if (item.isAnswered()) {
            throw new IllegalArgumentException("Esa pregunta ya ha sido respondida");
        }

        String letter = request.letter() == null ? "" : request.letter().trim().toUpperCase(Locale.ROOT);
        List<AnswerOption> options = item.getQuestion().getAnswerOptions();
        boolean validLetter = options.stream().anyMatch(o -> o.getLetter().equalsIgnoreCase(letter));
        if (!validLetter) {
            throw new IllegalArgumentException("Opción no válida: " + letter);
        }

        boolean correct = options.stream()
                .anyMatch(o -> o.getLetter().equalsIgnoreCase(letter) && Boolean.TRUE.equals(o.getIsCorrect()));
        item.setSelectedLetter(letter);
        item.setIsCorrect(correct);
        item.setAnsweredAt(LocalDateTime.now());

        if (userQuestionStatusService != null) {
            userQuestionStatusService.recordAnswer(session.getUser(), item.getQuestion(), correct);
        }

        List<String> categories = deserializeList(session.getCategories());
        List<String> tags = deserializeList(session.getTags());
        List<Question> pool = loadMatchingPool(
                username, session.getExamType(), categories, tags,
                session.isOnlyDoubt(), session.isOnlyFailed());

        appendNextQuestionIfAvailable(session, pool);

        ReviewSession saved = reviewSessionRepository.save(session);
        return toResponse(saved, pool.size());
    }

    @Transactional
    public ReviewSessionResponse finish(String username, Long sessionId) {
        ReviewSession session = requireSession(username, sessionId);
        List<String> categories = deserializeList(session.getCategories());
        List<String> tags = deserializeList(session.getTags());
        int totalMatching = loadMatchingPool(
                username, session.getExamType(), categories, tags,
                session.isOnlyDoubt(), session.isOnlyFailed()).size();

        if (!session.isFinished()) {
            session.getItems().removeIf(item -> !item.isAnswered());
            session.setFinishedAt(LocalDateTime.now());
            session = reviewSessionRepository.save(session);
        }
        return toResponse(session, totalMatching);
    }

    // --- Helpers -------------------------------------------------------------

    private ReviewSession requireSession(String username, Long sessionId) {
        ReviewSession session = reviewSessionRepository.findById(sessionId)
                .orElseThrow(() -> new NoSuchElementException("Repaso no encontrado: " + sessionId));
        if (session.getUser() == null || !session.getUser().getUsername().equals(username)) {
            throw new NoSuchElementException("Repaso no encontrado: " + sessionId);
        }
        session.getItems().size();
        return session;
    }

    private ExamType resolveExamType(String examTypeCode) {
        return examTypeRepository.findByCode(examTypeCode.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new NoSuchElementException("Tipo de examen no encontrado: " + examTypeCode));
    }

    private void checkBankAccess(String username, ExamType examType) {
        if (accessControlService.hasGlobalBankAccess(username)) {
            return;
        }
        Set<String> allowed = accessControlService.allowedBankCodes(username);
        if (allowed.isEmpty()) {
            throw new ForbiddenException(
                    "No tienes ningún banco de preguntas asignado. Contacta con un administrador.");
        }
        if (!allowed.contains(examType.getCode())) {
            throw new ForbiddenException("No tienes acceso al banco de preguntas: " + examType.getCode());
        }
    }

    private List<Question> loadMatchingPool(String username,
                                            ExamType examType,
                                            List<String> categories,
                                            List<String> tags,
                                            boolean onlyDoubt,
                                            boolean onlyFailed) {
        if (examType == null) {
            return List.of();
        }
        boolean filterByStatus = onlyDoubt || onlyFailed;
        Set<Long> matchingStatusIds = null;
        if (filterByStatus) {
            Set<QuestionLearningStatus> targetStatuses = new LinkedHashSet<>();
            if (onlyDoubt) {
                targetStatuses.add(QuestionLearningStatus.DOUBT);
            }
            if (onlyFailed) {
                targetStatuses.add(QuestionLearningStatus.FAILED);
            }
            matchingStatusIds = userQuestionStatusService == null
                    ? Set.of()
                    : userQuestionStatusService.findQuestionIdsByStatuses(username, targetStatuses);
            if (matchingStatusIds.isEmpty()) {
                return List.of();
            }
        }
        final Set<Long> allowedStatusIds = matchingStatusIds;
        List<Question> questions = questionRepository.findByExamTypeCode(examType.getCode());
        return questions.stream()
                .filter(ReviewSessionService::hasCorrectOption)
                .filter(q -> matchesCategories(q, categories))
                .filter(q -> matchesTags(q, tags))
                .filter(q -> !filterByStatus || allowedStatusIds.contains(q.getId()))
                .toList();
    }

    private static boolean matchesCategories(Question question, List<String> categories) {
        if (categories == null || categories.isEmpty()) {
            return true;
        }
        String qCategory = question.getCategory();
        if (qCategory == null || qCategory.isBlank()) {
            return false;
        }
        String trimmed = qCategory.trim();
        return categories.stream().anyMatch(c -> c.equalsIgnoreCase(trimmed));
    }

    private static boolean matchesTags(Question question, List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return true;
        }
        String qTag = question.getTag();
        return tags.stream().anyMatch(t -> QuestionTagSupport.containsTag(qTag, t));
    }

    private static boolean hasCorrectOption(Question question) {
        return question.getAnswerOptions() != null
                && question.getAnswerOptions().stream()
                        .anyMatch(o -> Boolean.TRUE.equals(o.getIsCorrect()));
    }

    private static boolean appendNextQuestionIfAvailable(ReviewSession session, List<Question> pool) {
        Set<Long> usedIds = session.getItems().stream()
                .map(i -> i.getQuestion().getId())
                .collect(Collectors.toSet());
        List<Question> remaining = new ArrayList<>();
        for (Question q : pool) {
            if (!usedIds.contains(q.getId())) {
                remaining.add(q);
            }
        }
        if (remaining.isEmpty()) {
            return false;
        }
        Collections.shuffle(remaining);
        ReviewSessionItem nextItem = new ReviewSessionItem();
        nextItem.setSession(session);
        nextItem.setQuestion(remaining.get(0));
        nextItem.setPosition(session.getItems().size() + 1);
        session.getItems().add(nextItem);
        return true;
    }

    private ReviewSessionResponse toResponse(ReviewSession session, int totalMatchingQuestions) {
        List<String> categories = deserializeList(session.getCategories());
        List<String> tags = deserializeList(session.getTags());
        List<FreeSessionResponse.Item> items = session.getItems().stream().map(this::toItem).toList();

        int answered = (int) session.getItems().stream().filter(ReviewSessionItem::isAnswered).count();
        int correct = (int) session.getItems().stream()
                .filter(i -> i.isAnswered() && Boolean.TRUE.equals(i.getIsCorrect()))
                .count();
        double accuracy = pct(correct, answered);

        int effectiveTotal = Math.max(totalMatchingQuestions, session.getItems().size());
        boolean hasUnansweredItem = session.getItems().stream().anyMatch(i -> !i.isAnswered());
        boolean hasMoreQuestions = !session.isFinished() && (hasUnansweredItem || answered < effectiveTotal);

        return new ReviewSessionResponse(
                session.getId(),
                session.getExamType() == null ? null : session.getExamType().getCode(),
                session.getExamType() == null ? null : session.getExamType().getName(),
                categories,
                tags,
                session.isOnlyDoubt(),
                session.isOnlyFailed(),
                effectiveTotal,
                answered,
                correct,
                accuracy,
                hasMoreQuestions,
                session.isFinished(),
                byCategory(session.getItems()),
                items);
    }

    private FreeSessionResponse.Item toItem(ReviewSessionItem item) {
        Question question = item.getQuestion();
        List<FreeSessionResponse.Option> options = question.getAnswerOptions().stream()
                .map(o -> new FreeSessionResponse.Option(o.getLetter(), o.getText()))
                .toList();
        String correctLetter = item.isAnswered()
                ? question.getAnswerOptions().stream()
                    .filter(o -> Boolean.TRUE.equals(o.getIsCorrect()))
                    .map(AnswerOption::getLetter)
                    .findFirst()
                    .orElse(null)
                : null;
        return new FreeSessionResponse.Item(
                item.getPosition(),
                question.getId(),
                question.getText(),
                question.getCategory(),
                question.getTag(),
                item.isAnswered() ? question.getExplanation() : null,
                options,
                item.isAnswered(),
                item.getSelectedLetter(),
                item.getIsCorrect(),
                correctLetter);
    }

    private static List<StatsOverviewResponse.CategoryStats> byCategory(List<ReviewSessionItem> items) {
        Map<String, CategoryAcc> acc = new LinkedHashMap<>();
        for (ReviewSessionItem item : items) {
            if (!item.isAnswered()) {
                continue;
            }
            String category = item.getQuestion() == null ? null : item.getQuestion().getCategory();
            acc.computeIfAbsent(categoryKey(category), k -> new CategoryAcc(categoryDisplay(category)))
                    .add(Boolean.TRUE.equals(item.getIsCorrect()));
        }
        return acc.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> {
                    CategoryAcc c = e.getValue();
                    return new StatsOverviewResponse.CategoryStats(
                            c.display,
                            c.answered,
                            c.correct,
                            pct(c.correct, c.answered));
                })
                .toList();
    }

    private static String categoryKey(String category) {
        String normalized = QuestionTextNormalizer.normalize(category);
        return normalized.isEmpty() ? NO_CATEGORY_KEY : normalized;
    }

    private static String categoryDisplay(String category) {
        return category == null || category.isBlank() ? NO_CATEGORY : category.trim();
    }

    private static List<String> normalizeList(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        Map<String, String> unique = new LinkedHashMap<>();
        for (String val : values) {
            if (val != null && !val.isBlank()) {
                String trimmed = val.trim();
                unique.putIfAbsent(trimmed.toLowerCase(Locale.ROOT), trimmed);
            }
        }
        return List.copyOf(unique.values());
    }

    private static String serializeList(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        return String.join("\n", values);
    }

    private static List<String> deserializeList(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        List<String> result = new ArrayList<>();
        for (String part : raw.split("\n")) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                result.add(trimmed);
            }
        }
        return List.copyOf(result);
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
}
