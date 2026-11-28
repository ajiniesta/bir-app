package bir.app.api.service;

import bir.app.api.dto.QuestionPageResponse;
import bir.app.api.dto.QuestionResponse;
import bir.app.api.dto.QuestionSummaryResponse;
import bir.app.api.entity.AppUser;
import bir.app.api.entity.Question;
import bir.app.api.entity.QuestionLearningStatus;
import bir.app.api.entity.UserQuestionStatus;
import bir.app.api.exception.ForbiddenException;
import bir.app.api.repository.QuestionRepository;
import bir.app.api.repository.UserQuestionStatusRepository;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.data.model.Page;
import io.micronaut.data.model.Pageable;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;

/**
 * Gestión del estado de aprendizaje de cada pregunta por usuario
 * ({@link QuestionLearningStatus#KNOWN}, {@link QuestionLearningStatus#DOUBT},
 * {@link QuestionLearningStatus#FAILED}).
 */
@Singleton
public class UserQuestionStatusService {

    public static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;
    private static final int CONSECUTIVE_CORRECT_TO_KNOWN = 3;

    private final UserQuestionStatusRepository statusRepository;
    private final QuestionRepository questionRepository;
    private final AccessControlService accessControlService;
    private final AppUserService appUserService;

    public UserQuestionStatusService(UserQuestionStatusRepository statusRepository,
                                     QuestionRepository questionRepository,
                                     AccessControlService accessControlService) {
        this(statusRepository, questionRepository, accessControlService, null);
    }

    @Inject
    public UserQuestionStatusService(UserQuestionStatusRepository statusRepository,
                                     QuestionRepository questionRepository,
                                     AccessControlService accessControlService,
                                     @Nullable AppUserService appUserService) {
        this.statusRepository = statusRepository;
        this.questionRepository = questionRepository;
        this.accessControlService = accessControlService;
        this.appUserService = appUserService;
    }

    @Transactional
    public UserQuestionStatus recordAnswer(AppUser user, Question question, boolean correct) {
        if (user == null || user.getId() == null || question == null || question.getId() == null) {
            return null;
        }
        Optional<UserQuestionStatus> existingOpt =
                statusRepository.findByUserIdAndQuestionId(user.getId(), question.getId());

        if (existingOpt.isEmpty()) {
            QuestionLearningStatus initialStatus =
                    correct ? QuestionLearningStatus.KNOWN : QuestionLearningStatus.FAILED;
            int streak = correct ? 1 : 0;
            UserQuestionStatus created = new UserQuestionStatus(user, question, initialStatus, streak);
            return statusRepository.save(created);
        }

        UserQuestionStatus current = existingOpt.get();
        QuestionLearningStatus prevStatus = current.getStatus();
        int prevStreak = current.getConsecutiveCorrect();

        QuestionLearningStatus nextStatus;
        int nextStreak;

        switch (prevStatus) {
            case KNOWN -> {
                if (correct) {
                    nextStatus = QuestionLearningStatus.KNOWN;
                    nextStreak = prevStreak + 1;
                } else {
                    nextStatus = QuestionLearningStatus.DOUBT;
                    nextStreak = 0;
                }
            }
            case FAILED -> {
                if (correct) {
                    nextStatus = QuestionLearningStatus.DOUBT;
                    nextStreak = 1;
                } else {
                    nextStatus = QuestionLearningStatus.FAILED;
                    nextStreak = 0;
                }
            }
            case DOUBT -> {
                if (correct) {
                    nextStreak = prevStreak + 1;
                    nextStatus = nextStreak >= CONSECUTIVE_CORRECT_TO_KNOWN
                            ? QuestionLearningStatus.KNOWN
                            : QuestionLearningStatus.DOUBT;
                } else {
                    nextStatus = QuestionLearningStatus.DOUBT;
                    nextStreak = 0;
                }
            }
            default -> {
                nextStatus = correct ? QuestionLearningStatus.KNOWN : QuestionLearningStatus.FAILED;
                nextStreak = correct ? 1 : 0;
            }
        }

        current.setStatus(nextStatus);
        current.setConsecutiveCorrect(nextStreak);
        current.setUpdatedAt(LocalDateTime.now());
        return statusRepository.update(current);
    }

    /**
     * Marca manualmente una pregunta como {@link QuestionLearningStatus#DOUBT} para el
     * usuario autenticado, reiniciando su racha de aciertos consecutivos a 0 (incluso si
     * acababa de acertarla).
     */
    @Transactional
    public UserQuestionStatus markAsDoubt(String username, Long questionId) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new NoSuchElementException("Pregunta no encontrada: " + questionId));

        if (!accessControlService.hasGlobalBankAccess(username)) {
            Set<String> allowed = accessControlService.allowedBankCodes(username);
            if (question.getExamType() == null || !allowed.contains(question.getExamType().getCode())) {
                throw new ForbiddenException("No tienes acceso al banco de esta pregunta");
            }
        }

        Optional<UserQuestionStatus> existingOpt =
                statusRepository.findByUserUsernameAndQuestionId(username, questionId);
        if (existingOpt.isPresent()) {
            UserQuestionStatus current = existingOpt.get();
            current.setStatus(QuestionLearningStatus.DOUBT);
            current.setConsecutiveCorrect(0);
            current.setUpdatedAt(LocalDateTime.now());
            return statusRepository.update(current);
        }

        if (appUserService == null) {
            throw new NoSuchElementException("Usuario no encontrado: " + username);
        }
        AppUser user = appUserService.requireByUsername(username);
        UserQuestionStatus created = new UserQuestionStatus(
                user, question, QuestionLearningStatus.DOUBT, 0);
        return statusRepository.save(created);
    }

    @Transactional
    public Set<Long> findDoubtQuestionIds(String username) {
        return findQuestionIdsByStatuses(username, Set.of(QuestionLearningStatus.DOUBT));
    }

    @Transactional
    public Set<Long> findQuestionIdsByStatuses(String username, Collection<QuestionLearningStatus> statuses) {
        if (username == null || username.isBlank() || statuses == null || statuses.isEmpty()) {
            return Set.of();
        }
        List<Long> ids = statusRepository.findQuestionIdsByUsernameAndStatusIn(username, statuses);
        return ids == null || ids.isEmpty() ? Set.of() : new HashSet<>(ids);
    }

    @Transactional
    public QuestionPageResponse searchDoubtQuestions(String username,
                                                     Integer page,
                                                     Integer size,
                                                     String q,
                                                     String examType,
                                                     String category,
                                                     String tag) {
        return searchDoubtQuestions(username, page, size, q, examType, category, tag, null);
    }

    @Transactional
    public QuestionPageResponse searchDoubtQuestions(String username,
                                                     Integer page,
                                                     Integer size,
                                                     String q,
                                                     String examType,
                                                     String category,
                                                     String tag,
                                                     String statusFilter) {
        int pageNumber = (page == null || page < 1) ? 1 : page;
        int pageSize = (size == null || size < 1)
                ? DEFAULT_PAGE_SIZE
                : Math.min(size, MAX_PAGE_SIZE);
        String examTypeCode = normalize(examType);
        String categoryFilter = normalize(category);
        String tagFilter = normalize(tag);
        String text = normalizeSearch(q);
        String pattern = "%" + text + "%";
        List<QuestionLearningStatus> statuses = resolveStatuses(statusFilter);

        boolean globalAccess = accessControlService.hasGlobalBankAccess(username);
        Set<String> allowedBanks = globalAccess ? Set.of() : accessControlService.allowedBankCodes(username);
        if (!globalAccess && allowedBanks.isEmpty()) {
            return new QuestionPageResponse(List.of(), 1, pageSize, 0, 0);
        }

        Page<UserQuestionStatus> result = queryPage(
                username,
                statuses,
                globalAccess,
                allowedBanks,
                examTypeCode == null ? "" : examTypeCode,
                categoryFilter == null ? "" : categoryFilter,
                tagFilter == null ? "" : tagFilter,
                pattern,
                Pageable.from(pageNumber - 1, pageSize));

        if (result.getTotalPages() > 0 && pageNumber > result.getTotalPages()) {
            result = queryPage(
                    username,
                    statuses,
                    globalAccess,
                    allowedBanks,
                    examTypeCode == null ? "" : examTypeCode,
                    categoryFilter == null ? "" : categoryFilter,
                    tagFilter == null ? "" : tagFilter,
                    pattern,
                    Pageable.from(result.getTotalPages() - 1, pageSize));
        }

        List<QuestionSummaryResponse> items = result.getContent() == null
                ? List.of()
                : result.getContent().stream()
                        .map(uqs -> QuestionSummaryResponse.from(
                                uqs.getQuestion(),
                                uqs.getStatus() == null ? null : uqs.getStatus().name()))
                        .toList();
        return new QuestionPageResponse(
                items,
                result.getPageNumber() + 1,
                result.getSize(),
                result.getTotalSize(),
                result.getTotalPages());
    }

    @Transactional
    public QuestionResponse getDoubtQuestionDetail(String username, Long questionId) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new NoSuchElementException("Pregunta no encontrada: " + questionId));

        if (!accessControlService.hasGlobalBankAccess(username)) {
            Set<String> allowed = accessControlService.allowedBankCodes(username);
            if (question.getExamType() == null || !allowed.contains(question.getExamType().getCode())) {
                throw new ForbiddenException("No tienes acceso al banco de esta pregunta");
            }
        }

        UserQuestionStatus status = statusRepository.findByUserUsernameAndQuestionId(username, questionId)
                .orElseThrow(() -> new NoSuchElementException("Pregunta en duda o fallida no encontrada: " + questionId));
        if (status.getStatus() != QuestionLearningStatus.DOUBT
                && status.getStatus() != QuestionLearningStatus.FAILED) {
            throw new NoSuchElementException("Pregunta en duda o fallida no encontrada: " + questionId);
        }

        return QuestionResponse.from(question, status.getStatus().name());
    }

    private static List<QuestionLearningStatus> resolveStatuses(String statusFilter) {
        if (statusFilter != null && !statusFilter.isBlank()) {
            String normalized = statusFilter.trim().toUpperCase(Locale.ROOT);
            if ("DOUBT".equals(normalized)) {
                return List.of(QuestionLearningStatus.DOUBT);
            }
            if ("FAILED".equals(normalized)) {
                return List.of(QuestionLearningStatus.FAILED);
            }
        }
        return List.of(QuestionLearningStatus.DOUBT, QuestionLearningStatus.FAILED);
    }

    private Page<UserQuestionStatus> queryPage(String username,
                                               List<QuestionLearningStatus> statuses,
                                               boolean globalAccess,
                                               Set<String> allowedBanks,
                                               String examType,
                                               String category,
                                               String tag,
                                               String pattern,
                                               Pageable pageable) {
        if (globalAccess) {
            return statusRepository.searchAllByUsernameAndStatuses(
                    username,
                    statuses,
                    examType,
                    category,
                    tag,
                    pattern,
                    pageable);
        }
        return statusRepository.searchByUsernameAndStatuses(
                username,
                statuses,
                allowedBanks,
                examType,
                category,
                tag,
                pattern,
                pageable);
    }

    private static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String normalizeSearch(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return Normalizer.normalize(value.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }
}
