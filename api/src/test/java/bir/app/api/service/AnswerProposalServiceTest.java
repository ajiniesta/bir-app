package bir.app.api.service;

import bir.app.api.dto.AnswerProposalResponse;
import bir.app.api.dto.CreateAnswerProposalRequest;
import bir.app.api.dto.CreateQuestionRequest;
import bir.app.api.dto.MyProposalResponse;
import bir.app.api.dto.ReviewProposalRequest;
import bir.app.api.entity.AnswerProposal;
import bir.app.api.entity.AppUser;
import bir.app.api.entity.ExamType;
import bir.app.api.entity.FreeSession;
import bir.app.api.entity.MockExamAttempt;
import bir.app.api.entity.ProposalSource;
import bir.app.api.entity.ProposalStatus;
import bir.app.api.entity.Question;
import bir.app.api.entity.SessionItem;
import bir.app.api.entity.UserRole;
import bir.app.api.repository.AnswerProposalRepository;
import bir.app.api.repository.FreeSessionRepository;
import bir.app.api.repository.MockExamAttemptRepository;
import bir.app.api.repository.QuestionRepository;
import bir.app.api.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AnswerProposalService")
class AnswerProposalServiceTest {

    @Mock
    AnswerProposalRepository proposalRepository;
    @Mock
    QuestionRepository questionRepository;
    @Mock
    FreeSessionRepository freeSessionRepository;
    @Mock
    MockExamAttemptRepository attemptRepository;
    @Mock
    AppUserService appUserService;
    @Mock
    QuestionService questionService;

    AnswerProposalService service;

    AppUser demo = TestData.user(1L, "demo", UserRole.USER);
    AppUser admin = TestData.user(2L, "admin", UserRole.ADMIN);

    @BeforeEach
    void setUp() {
        service = new AnswerProposalService(proposalRepository, questionRepository,
                freeSessionRepository, attemptRepository, appUserService, questionService);
    }

    private static Question question() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        Question question = TestData.question(1L, "Enunciado", examType,
                TestData.option("A", "Opción A", true),
                TestData.option("B", "Opción B", false));
        question.setCategory("Anatomía");
        question.setTag("Tema 1");
        question.setExplanation("Explicación");
        return question;
    }

    private static AnswerProposal proposal(Question question, AppUser user, ProposalStatus status,
                                           String letter, String text) {
        AnswerProposal proposal = new AnswerProposal();
        proposal.setId(9L);
        proposal.setQuestion(question);
        proposal.setProposedBy(user);
        proposal.setComment("Motivo");
        proposal.setSource(ProposalSource.FREE_SESSION);
        proposal.setSourceId(10L);
        proposal.setPosition(1);
        proposal.setStatus(status);
        proposal.setProposedLetter(letter);
        proposal.setProposedText(text);
        return proposal;
    }

    private static CreateAnswerProposalRequest request(String letter, String text, String comment) {
        return new CreateAnswerProposalRequest(1L, letter, text, comment,
                "free_session", 10L, 1, "a");
    }

    private FreeSession ownedSession(Question question, boolean answered) {
        FreeSession session = TestData.freeSession(10L, demo,
                TestData.examType(1L, "MIR", "MIR"), null, null, question);
        SessionItem item = session.getItems().get(0);
        if (answered) {
            item.setAnsweredAt(LocalDateTime.now());
            item.setSelectedLetter("A");
            item.setIsCorrect(true);
        }
        return session;
    }

    @Test
    @DisplayName("exige un motivo para la propuesta")
    void proposeRequiresComment() {
        when(appUserService.requireByUsername("demo")).thenReturn(demo);
        when(questionRepository.findById(1L)).thenReturn(Optional.of(question()));

        assertThatThrownBy(() -> service.propose("demo", request("B", null, "  ")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("motivo de la propuesta es obligatorio");

        verify(proposalRepository, never()).save(any(AnswerProposal.class));
    }

    @Test
    @DisplayName("exige indicar una opción o un texto alternativo")
    void proposeRequiresOptionOrText() {
        when(appUserService.requireByUsername("demo")).thenReturn(demo);
        when(questionRepository.findById(1L)).thenReturn(Optional.of(question()));

        assertThatThrownBy(() -> service.propose("demo", request(null, "  ", "Motivo")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Indica una opción o un texto alternativo");
    }

    @Test
    @DisplayName("rechaza una opción propuesta que no existe en la pregunta")
    void proposeRejectsUnknownOption() {
        when(appUserService.requireByUsername("demo")).thenReturn(demo);
        when(questionRepository.findById(1L)).thenReturn(Optional.of(question()));

        assertThatThrownBy(() -> service.propose("demo", request("Z", null, "Motivo")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("La opción propuesta no existe");
    }

    @Test
    @DisplayName("rechaza proponer sobre una partida de otro usuario")
    void proposeRejectsSessionOfAnotherUser() {
        Question question = question();
        FreeSession session = TestData.freeSession(10L,
                TestData.user(3L, "otro", UserRole.USER),
                TestData.examType(1L, "MIR", "MIR"), null, null, question);
        when(appUserService.requireByUsername("demo")).thenReturn(demo);
        when(questionRepository.findById(1L)).thenReturn(Optional.of(question));
        when(freeSessionRepository.findById(10L)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.propose("demo", request("B", null, "Motivo")))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("Sesión no encontrada");
    }

    @Test
    @DisplayName("rechaza proponer sobre una pregunta sin responder")
    void proposeRejectsUnansweredItem() {
        Question question = question();
        when(appUserService.requireByUsername("demo")).thenReturn(demo);
        when(questionRepository.findById(1L)).thenReturn(Optional.of(question));
        when(freeSessionRepository.findById(10L))
                .thenReturn(Optional.of(ownedSession(question, false)));

        assertThatThrownBy(() -> service.propose("demo", request("B", null, "Motivo")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Debes responder la pregunta antes de proponer");
    }

    @Test
    @DisplayName("rechaza proponer sobre un simulacro sin entregar")
    void proposeRejectsUnfinishedAttempt() {
        Question question = question();
        MockExamAttempt attempt = new MockExamAttempt();
        attempt.setId(30L);
        when(appUserService.requireByUsername("demo")).thenReturn(demo);
        when(questionRepository.findById(1L)).thenReturn(Optional.of(question));
        when(attemptRepository.findByIdAndUsername(30L, "demo")).thenReturn(Optional.of(attempt));

        CreateAnswerProposalRequest request = new CreateAnswerProposalRequest(
                1L, "B", null, "Motivo", "MOCK_EXAM_ATTEMPT", 30L, 1, "A");

        assertThatThrownBy(() -> service.propose("demo", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Debes entregar el simulacro antes de proponer");
    }

    @Test
    @DisplayName("crea una propuesta PENDING y normaliza letras y textos")
    void proposeCreatesPendingProposal() {
        Question question = question();
        when(appUserService.requireByUsername("demo")).thenReturn(demo);
        when(questionRepository.findById(1L)).thenReturn(Optional.of(question));
        when(freeSessionRepository.findById(10L))
                .thenReturn(Optional.of(ownedSession(question, true)));
        when(proposalRepository.findByQuestionIdAndProposedByUsername(1L, "demo"))
                .thenReturn(Optional.empty());
        when(proposalRepository.save(any(AnswerProposal.class))).thenAnswer(invocation -> {
            AnswerProposal saved = invocation.getArgument(0);
            saved.setId(50L);
            return saved;
        });

        AnswerProposalResponse response = service.propose("demo",
                request("b", "  Texto alternativo  ", "  Motivo  "));

        assertThat(response.id()).isEqualTo(50L);
        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(response.proposedLetter()).isEqualTo("B");
        assertThat(response.proposedText()).isEqualTo("Texto alternativo");
        assertThat(response.comment()).isEqualTo("Motivo");
        assertThat(response.selectedLetter()).isEqualTo("A");
        assertThat(response.source()).isEqualTo("FREE_SESSION");
        assertThat(response.proposedBy()).isEqualTo("demo");
        assertThat(response.correctLetter()).isEqualTo("A");
    }

    @Test
    @DisplayName("reenviar una propuesta rechazada la actualiza y vuelve a PENDING")
    void proposeResetsRejectedProposal() {
        Question question = question();
        AnswerProposal existing = proposal(question, demo, ProposalStatus.REJECTED, "A", null);
        existing.setReviewedBy(admin);
        existing.setReviewedAt(LocalDateTime.now());
        existing.setReviewerNote("No procede");
        existing.setAppliedBy(admin);
        existing.setAppliedAt(LocalDateTime.now());

        when(appUserService.requireByUsername("demo")).thenReturn(demo);
        when(questionRepository.findById(1L)).thenReturn(Optional.of(question));
        when(freeSessionRepository.findById(10L))
                .thenReturn(Optional.of(ownedSession(question, true)));
        when(proposalRepository.findByQuestionIdAndProposedByUsername(1L, "demo"))
                .thenReturn(Optional.of(existing));
        when(proposalRepository.save(any(AnswerProposal.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AnswerProposalResponse response = service.propose("demo",
                request("B", "Nuevo texto", "Otro motivo"));

        assertThat(response.id()).isEqualTo(9L);
        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(response.proposedLetter()).isEqualTo("B");
        assertThat(response.reviewedBy()).isNull();
        assertThat(response.reviewerNote()).isNull();
        assertThat(response.appliedAt()).isNull();
        assertThat(existing.getStatus()).isEqualTo(ProposalStatus.PENDING);
    }

    @Test
    @DisplayName("no permite reenviar una propuesta ya aceptada")
    void proposeRejectsAlreadyAcceptedProposal() {
        Question question = question();
        when(appUserService.requireByUsername("demo")).thenReturn(demo);
        when(questionRepository.findById(1L)).thenReturn(Optional.of(question));
        when(freeSessionRepository.findById(10L))
                .thenReturn(Optional.of(ownedSession(question, true)));
        when(proposalRepository.findByQuestionIdAndProposedByUsername(1L, "demo"))
                .thenReturn(Optional.of(proposal(question, demo, ProposalStatus.ACCEPTED, "B", null)));

        assertThatThrownBy(() -> service.propose("demo", request("B", null, "Motivo")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Ya existe una propuesta aceptada");
    }

    @Test
    @DisplayName("aceptar una propuesta aplica el cambio conservando tags y explicación")
    void reviewAcceptedAppliesChange() {
        Question question = question();
        AnswerProposal proposal = proposal(question, demo, ProposalStatus.PENDING, "B", "Nuevo texto B");
        when(proposalRepository.findById(9L)).thenReturn(Optional.of(proposal));
        when(appUserService.requireByUsername("admin")).thenReturn(admin);
        when(questionService.update(eq(1L), any(CreateQuestionRequest.class)))
                .thenAnswer(invocation -> null);
        when(proposalRepository.save(any(AnswerProposal.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AnswerProposalResponse response = service.review("admin", 9L,
                new ReviewProposalRequest("ACCEPTED", "  Revisado  "));

        ArgumentCaptor<CreateQuestionRequest> updated = ArgumentCaptor.forClass(CreateQuestionRequest.class);
        verify(questionService).update(eq(1L), updated.capture());
        assertThat(updated.getValue().tag()).isEqualTo("Tema 1");
        assertThat(updated.getValue().category()).isEqualTo("Anatomía");
        assertThat(updated.getValue().explanation()).isEqualTo("Explicación");
        assertThat(updated.getValue().examTypeId()).isEqualTo(1L);
        assertThat(updated.getValue().answerOptions())
                .filteredOn(CreateQuestionRequest.AnswerOptionRequest::isCorrect)
                .extracting(CreateQuestionRequest.AnswerOptionRequest::letter)
                .containsExactly("B");
        assertThat(updated.getValue().answerOptions())
                .filteredOn(o -> o.letter().equals("B"))
                .extracting(CreateQuestionRequest.AnswerOptionRequest::text)
                .containsExactly("Nuevo texto B");

        assertThat(response.status()).isEqualTo("ACCEPTED");
        assertThat(response.reviewedBy()).isEqualTo("admin");
        assertThat(response.reviewerNote()).isEqualTo("Revisado");
        assertThat(response.appliedBy()).isEqualTo("admin");
        assertThat(response.appliedAt()).isNotNull();
    }

    @Test
    @DisplayName("rechazar una propuesta no modifica la pregunta")
    void reviewRejectedLeavesQuestionUntouched() {
        Question question = question();
        AnswerProposal proposal = proposal(question, demo, ProposalStatus.PENDING, "B", null);
        when(proposalRepository.findById(9L)).thenReturn(Optional.of(proposal));
        when(appUserService.requireByUsername("admin")).thenReturn(admin);
        when(proposalRepository.save(any(AnswerProposal.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AnswerProposalResponse response = service.review("admin", 9L,
                new ReviewProposalRequest("rejected", null));

        assertThat(response.status()).isEqualTo("REJECTED");
        assertThat(response.appliedAt()).isNull();
        verify(questionService, never()).update(any(), any());
    }

    @Test
    @DisplayName("el veredicto debe ser ACCEPTED o REJECTED")
    void reviewRejectsPendingStatus() {
        Question question = question();
        when(proposalRepository.findById(9L))
                .thenReturn(Optional.of(proposal(question, demo, ProposalStatus.PENDING, "B", null)));

        assertThatThrownBy(() -> service.review("admin", 9L,
                new ReviewProposalRequest("PENDING", null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ACCEPTED o REJECTED");
    }

    @Test
    @DisplayName("no se puede aplicar una propuesta no aceptada")
    void applyRejectsNonAcceptedProposal() {
        Question question = question();
        when(proposalRepository.findById(9L))
                .thenReturn(Optional.of(proposal(question, demo, ProposalStatus.REJECTED, "B", null)));

        assertThatThrownBy(() -> service.apply("admin", 9L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Solo se pueden aplicar propuestas aceptadas");
    }

    @Test
    @DisplayName("aplicar una propuesta aceptada sin cambios reales lanza un error")
    void applyRejectsProposalWithoutChanges() {
        Question question = question();
        when(proposalRepository.findById(9L))
                .thenReturn(Optional.of(proposal(question, demo, ProposalStatus.ACCEPTED, null, null)));

        assertThatThrownBy(() -> service.apply("admin", 9L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no implica ningún cambio");
    }

    @Test
    @DisplayName("cuenta las propuestas pendientes")
    void pendingCountDelegatesToRepository() {
        when(proposalRepository.countByStatus(ProposalStatus.PENDING)).thenReturn(4L);

        assertThat(service.pendingCount()).isEqualTo(4L);
    }

    @Test
    @DisplayName("filtra la bandeja de revisión por estado y por banco")
    void listForReviewFiltersByStatusAndExamType() {
        ExamType mir = TestData.examType(1L, "MIR", "MIR");
        ExamType eir = TestData.examType(2L, "EIR", "EIR");
        Question mirQuestion = TestData.question(1L, "Pregunta MIR", mir, TestData.option("A", "A", true));
        Question eirQuestion = TestData.question(2L, "Pregunta EIR", eir, TestData.option("A", "A", true));
        AnswerProposal mirProposal = proposal(mirQuestion, demo, ProposalStatus.PENDING, "A", null);
        AnswerProposal eirProposal = proposal(eirQuestion, demo, ProposalStatus.PENDING, "A", null);
        eirProposal.setId(10L);
        when(proposalRepository.findOrdered()).thenReturn(List.of(mirProposal, eirProposal));

        List<AnswerProposalResponse> filtered = service.listForReview(null, "mir");

        assertThat(filtered).hasSize(1);
        assertThat(filtered.get(0).examTypeCode()).isEqualTo("MIR");
    }

    @Test
    @DisplayName("devuelve mis propuestas para las preguntas indicadas")
    void mineReturnsProposalsForQuestions() {
        Question question = question();
        AnswerProposal proposal = proposal(question, demo, ProposalStatus.PENDING, "B", "Texto");
        when(proposalRepository.findByQuestionIdInAndProposedByUsername(List.of(1L), "demo"))
                .thenReturn(List.of(proposal));

        List<MyProposalResponse> mine = service.mine("demo", List.of(1L));

        assertThat(mine).singleElement().satisfies(response -> {
            assertThat(response.questionId()).isEqualTo(1L);
            assertThat(response.status()).isEqualTo("PENDING");
            assertThat(response.proposedLetter()).isEqualTo("B");
            assertThat(response.proposedText()).isEqualTo("Texto");
        });
    }

    @Test
    @DisplayName("sin preguntas no consulta la base de datos")
    void mineWithoutQuestionIds() {
        assertThat(service.mine("demo", List.of())).isEmpty();
        verify(proposalRepository, never())
                .findByQuestionIdInAndProposedByUsername(any(), any());
    }
}
