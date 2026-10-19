package bir.app.api.service;

import bir.app.api.dto.AnswerProposalResponse;
import bir.app.api.dto.CreateAnswerProposalRequest;
import bir.app.api.dto.CreateQuestionRequest;
import bir.app.api.dto.MyProposalResponse;
import bir.app.api.dto.ReviewProposalRequest;
import bir.app.api.entity.AnswerOption;
import bir.app.api.entity.AnswerProposal;
import bir.app.api.entity.AppUser;
import bir.app.api.entity.FreeSession;
import bir.app.api.entity.MockExamAttempt;
import bir.app.api.entity.MockExamAttemptItem;
import bir.app.api.entity.ProposalSource;
import bir.app.api.entity.ProposalStatus;
import bir.app.api.entity.Question;
import bir.app.api.entity.SessionItem;
import bir.app.api.repository.AnswerProposalRepository;
import bir.app.api.repository.FreeSessionRepository;
import bir.app.api.repository.MockExamAttemptRepository;
import bir.app.api.repository.QuestionRepository;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * Propuestas de respuesta alternativa y su revisión.
 * <ul>
 *   <li>Cualquier usuario autenticado puede proponer sobre una pregunta que ha
 *       visto en una partida o intento propio.</li>
 *   <li>ADMIN/CREATOR revisan (aceptar/rechazar + nota) y pueden aplicar el
 *       cambio a la pregunta de forma independiente.</li>
 * </ul>
 */
@Singleton
public class AnswerProposalService {

    private final AnswerProposalRepository proposalRepository;
    private final QuestionRepository questionRepository;
    private final FreeSessionRepository freeSessionRepository;
    private final MockExamAttemptRepository attemptRepository;
    private final AppUserService appUserService;
    private final QuestionService questionService;

    public AnswerProposalService(AnswerProposalRepository proposalRepository,
                                 QuestionRepository questionRepository,
                                 FreeSessionRepository freeSessionRepository,
                                 MockExamAttemptRepository attemptRepository,
                                 AppUserService appUserService,
                                 QuestionService questionService) {
        this.proposalRepository = proposalRepository;
        this.questionRepository = questionRepository;
        this.freeSessionRepository = freeSessionRepository;
        this.attemptRepository = attemptRepository;
        this.appUserService = appUserService;
        this.questionService = questionService;
    }

    // --- Usuario -------------------------------------------------------------

    @Transactional
    public AnswerProposalResponse propose(String username, CreateAnswerProposalRequest request) {
        AppUser user = appUserService.requireByUsername(username);
        Question question = questionRepository.findById(request.questionId())
                .orElseThrow(() -> new NoSuchElementException("Pregunta no encontrada: " + request.questionId()));

        String comment = request.comment() == null ? "" : request.comment().trim();
        if (comment.isBlank()) {
            throw new IllegalArgumentException("El motivo de la propuesta es obligatorio");
        }

        String proposedLetter = normalizeLetter(request.proposedLetter());
        String proposedText = normalizeText(request.proposedText());
        if (proposedLetter == null && proposedText == null) {
            throw new IllegalArgumentException("Indica una opción o un texto alternativo");
        }
        if (proposedLetter != null && question.getAnswerOptions().stream()
                .noneMatch(o -> o.getLetter().equalsIgnoreCase(proposedLetter))) {
            throw new IllegalArgumentException("La opción propuesta no existe: " + proposedLetter);
        }

        ProposalSource source = parseSource(request.source());
        validateContext(username, question.getId(), source, request.sourceId(), request.position());

        AnswerProposal proposal = proposalRepository
                .findByQuestionIdAndProposedByUsername(question.getId(), username)
                .orElseGet(AnswerProposal::new);
        if (proposal.getId() != null && proposal.getStatus() == ProposalStatus.ACCEPTED) {
            throw new IllegalArgumentException("Ya existe una propuesta aceptada para esta pregunta");
        }

        proposal.setQuestion(question);
        proposal.setProposedBy(user);
        proposal.setProposedLetter(proposedLetter);
        proposal.setProposedText(proposedText);
        proposal.setComment(comment);
        proposal.setSource(source);
        proposal.setSourceId(request.sourceId());
        proposal.setPosition(request.position());
        proposal.setSelectedLetter(normalizeLetter(request.selectedLetter()));
        // Al reenviar se reinicia la revisión (sigue sin estar aceptada).
        proposal.setStatus(ProposalStatus.PENDING);
        proposal.setReviewedBy(null);
        proposal.setReviewedAt(null);
        proposal.setReviewerNote(null);
        proposal.setAppliedBy(null);
        proposal.setAppliedAt(null);

        return toResponse(proposalRepository.save(proposal));
    }

    @Transactional
    public List<MyProposalResponse> mine(String username, List<Long> questionIds) {
        if (questionIds == null || questionIds.isEmpty()) {
            return List.of();
        }
        return proposalRepository.findByQuestionIdInAndProposedByUsername(questionIds, username).stream()
                .map(p -> new MyProposalResponse(
                        p.getId(),
                        p.getQuestion().getId(),
                        p.getStatus().name(),
                        p.getProposedLetter(),
                        p.getProposedText(),
                        p.getComment()))
                .toList();
    }

    // --- Revisión (ADMIN/CREATOR) -------------------------------------------

    @Transactional
    public List<AnswerProposalResponse> listForReview(String statusName, String examTypeCode) {
        List<AnswerProposal> proposals = (statusName == null || statusName.isBlank())
                ? proposalRepository.findOrdered()
                : proposalRepository.findOrderedByStatus(parseStatus(statusName));
        return proposals.stream()
                .filter(p -> examTypeCode == null || examTypeCode.isBlank()
                        || (p.getQuestion() != null
                            && examTypeCode.equalsIgnoreCase(p.getQuestion().getExamType().getCode())))
                .map(AnswerProposalService::toResponse)
                .toList();
    }

    @Transactional
    public long pendingCount() {
        return proposalRepository.countByStatus(ProposalStatus.PENDING);
    }

    /**
     * Veredicto del revisor. Al <strong>aceptar</strong> se aplica el cambio en el
     * acto (la opción propuesta pasa a ser la correcta). Al rechazar no se toca la
     * pregunta.
     */
    @Transactional
    public AnswerProposalResponse review(String username, Long id, ReviewProposalRequest request) {
        AnswerProposal proposal = require(id);
        ProposalStatus status = parseStatus(request.status());
        if (status == ProposalStatus.PENDING) {
            throw new IllegalArgumentException("El veredicto debe ser ACCEPTED o REJECTED");
        }
        proposal.setStatus(status);
        proposal.setReviewedBy(appUserService.requireByUsername(username));
        proposal.setReviewedAt(LocalDateTime.now());
        proposal.setReviewerNote(normalizeText(request.note()));
        if (status == ProposalStatus.ACCEPTED) {
            // Aceptar implica aplicar el cambio a la pregunta.
            applyChange(proposal, username);
        }
        return toResponse(proposalRepository.save(proposal));
    }

    /** Aplica la propuesta a la pregunta. Solo si ya está aceptada. */
    @Transactional
    public AnswerProposalResponse apply(String username, Long id) {
        AnswerProposal proposal = require(id);
        if (proposal.getStatus() != ProposalStatus.ACCEPTED) {
            throw new IllegalArgumentException("Solo se pueden aplicar propuestas aceptadas");
        }
        boolean changed = applyChange(proposal, username);
        if (!changed && proposal.getAppliedAt() == null) {
            throw new IllegalArgumentException("La propuesta no implica ningún cambio en la pregunta");
        }
        return toResponse(proposalRepository.save(proposal));
    }

    /**
     * Aplica el cambio a la pregunta: la opción propuesta ({@code proposedLetter},
     * o la correcta actual si no se indicó otra) pasa a ser la única correcta y,
     * si hay texto alternativo, se reescribe esa opción.
     *
     * @return {@code true} si modificó la pregunta; {@code false} si la propuesta
     *         no implicaba ningún cambio real (ya estaba así).
     */
    private boolean applyChange(AnswerProposal proposal, String username) {
        Question question = proposal.getQuestion();
        if (question == null) {
            throw new NoSuchElementException("La pregunta ya no existe");
        }

        List<AnswerOption> options = question.getAnswerOptions();
        String currentCorrect = options.stream()
                .filter(o -> Boolean.TRUE.equals(o.getIsCorrect()))
                .map(AnswerOption::getLetter)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("La pregunta no tiene una opción correcta"));
        String targetLetter = proposal.getProposedLetter() != null
                ? proposal.getProposedLetter()
                : currentCorrect;

        AnswerOption target = options.stream()
                .filter(o -> o.getLetter().equalsIgnoreCase(targetLetter))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "La opción propuesta ya no existe en la pregunta: " + targetLetter));

        boolean letterChanges = proposal.getProposedLetter() != null
                && !targetLetter.equalsIgnoreCase(currentCorrect);
        boolean textChanges = proposal.getProposedText() != null
                && !proposal.getProposedText().equals(target.getText());
        if (!letterChanges && !textChanges) {
            return false;
        }

        List<CreateQuestionRequest.AnswerOptionRequest> newOptions = options.stream()
                .map(o -> {
                    boolean isTarget = o.getLetter().equalsIgnoreCase(targetLetter);
                    String text = isTarget && proposal.getProposedText() != null
                            ? proposal.getProposedText()
                            : o.getText();
                    return new CreateQuestionRequest.AnswerOptionRequest(o.getLetter(), text, isTarget);
                })
                .toList();
        questionService.update(question.getId(), new CreateQuestionRequest(
                question.getText(), question.getCategory(), question.getExplanation(),
                question.getExamType().getId(), newOptions));

        proposal.setAppliedBy(appUserService.requireByUsername(username));
        proposal.setAppliedAt(LocalDateTime.now());
        return true;
    }

    // --- Helpers -------------------------------------------------------------

    private AnswerProposal require(Long id) {
        return proposalRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Propuesta no encontrada: " + id));
    }

    /** Comprueba que la pregunta se vio en una partida/intento del propio usuario. */
    private void validateContext(String username, Long questionId, ProposalSource source,
                                 Long sourceId, Integer position) {
        if (sourceId == null || position == null) {
            throw new IllegalArgumentException("Falta el contexto de la propuesta");
        }
        if (source == ProposalSource.FREE_SESSION) {
            FreeSession session = freeSessionRepository.findById(sourceId)
                    .orElseThrow(() -> new NoSuchElementException("Sesión no encontrada: " + sourceId));
            if (!session.getUser().getUsername().equals(username)) {
                throw new NoSuchElementException("Sesión no encontrada: " + sourceId);
            }
            SessionItem item = session.getItems().stream()
                    .filter(i -> i.getPosition().equals(position))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("La pregunta no pertenece a la partida"));
            if (!item.isAnswered()) {
                throw new IllegalArgumentException("Debes responder la pregunta antes de proponer");
            }
            if (!item.getQuestion().getId().equals(questionId)) {
                throw new IllegalArgumentException("La pregunta no coincide con la partida");
            }
        } else {
            MockExamAttempt attempt = attemptRepository.findByIdAndUsername(sourceId, username)
                    .orElseThrow(() -> new NoSuchElementException("Intento no encontrado: " + sourceId));
            if (!attempt.isFinished()) {
                throw new IllegalArgumentException("Debes entregar el simulacro antes de proponer");
            }
            MockExamAttemptItem item = attempt.getItems().stream()
                    .filter(i -> i.getPosition().equals(position))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("La pregunta no pertenece al intento"));
            if (item.getQuestion() == null || !item.getQuestion().getId().equals(questionId)) {
                throw new IllegalArgumentException("La pregunta no coincide con el intento");
            }
        }
    }

    private static AnswerProposalResponse toResponse(AnswerProposal p) {
        Question q = p.getQuestion();
        List<AnswerProposalResponse.Option> options = q == null ? List.of()
                : q.getAnswerOptions().stream()
                    .map(o -> new AnswerProposalResponse.Option(
                            o.getLetter(), o.getText(), Boolean.TRUE.equals(o.getIsCorrect())))
                    .toList();
        String correctLetter = options.stream()
                .filter(AnswerProposalResponse.Option::isCorrect)
                .map(AnswerProposalResponse.Option::letter)
                .findFirst()
                .orElse(null);

        return new AnswerProposalResponse(
                p.getId(),
                q == null ? null : q.getId(),
                q == null ? "(pregunta eliminada)" : q.getText(),
                q == null ? null : q.getCategory(),
                q == null ? null : q.getExamType().getCode(),
                correctLetter,
                options,
                p.getProposedBy().getUsername(),
                p.getProposedBy().getDisplayName(),
                p.getProposedLetter(),
                p.getProposedText(),
                p.getComment(),
                p.getSource().name(),
                p.getSourceId(),
                p.getPosition(),
                p.getSelectedLetter(),
                p.getStatus().name(),
                p.getCreatedAt(),
                p.getReviewedBy() == null ? null : p.getReviewedBy().getUsername(),
                p.getReviewedAt(),
                p.getReviewerNote(),
                p.getAppliedBy() == null ? null : p.getAppliedBy().getUsername(),
                p.getAppliedAt());
    }

    private static String normalizeLetter(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toUpperCase();
    }

    private static String normalizeText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static ProposalStatus parseStatus(String value) {
        try {
            return ProposalStatus.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new IllegalArgumentException("Estado no válido: " + value);
        }
    }

    private static ProposalSource parseSource(String value) {
        try {
            return ProposalSource.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new IllegalArgumentException("Origen no válido: " + value);
        }
    }
}
