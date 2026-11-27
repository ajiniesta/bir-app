package bir.app.api.service;

import bir.app.api.dto.AnswerRequest;
import bir.app.api.dto.CreateReviewSessionRequest;
import bir.app.api.dto.FreeSessionResponse;
import bir.app.api.dto.ReviewFiltersResponse;
import bir.app.api.dto.ReviewSessionResponse;
import bir.app.api.dto.ReviewSessionSummaryResponse;
import bir.app.api.dto.StatsOverviewResponse;
import bir.app.api.entity.AppUser;
import bir.app.api.entity.ExamType;
import bir.app.api.entity.Question;
import bir.app.api.entity.ReviewSession;
import bir.app.api.entity.ReviewSessionItem;
import bir.app.api.entity.UserRole;
import bir.app.api.exception.ForbiddenException;
import bir.app.api.repository.ExamTypeRepository;
import bir.app.api.repository.QuestionRepository;
import bir.app.api.repository.ReviewSessionRepository;
import bir.app.api.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReviewSessionService")
class ReviewSessionServiceTest {

    @Mock
    ReviewSessionRepository reviewSessionRepository;
    @Mock
    QuestionRepository questionRepository;
    @Mock
    ExamTypeRepository examTypeRepository;
    @Mock
    AppUserService appUserService;
    @Mock
    AccessControlService accessControlService;

    ReviewSessionService service;

    @BeforeEach
    void setUp() {
        service = new ReviewSessionService(
                reviewSessionRepository,
                questionRepository,
                examTypeRepository,
                appUserService,
                accessControlService);
    }

    private static Question question(long id, ExamType examType, String category, String tag) {
        Question question = TestData.question(id, "Pregunta " + id, examType,
                TestData.option("A", "Opción A", true),
                TestData.option("B", "Opción B", false));
        question.setCategory(category);
        question.setTag(tag);
        question.setExplanation("Explicación " + id);
        return question;
    }

    private static ReviewSession reviewSession(Long id, AppUser user, ExamType examType,
                                               String categories, String tags, Question... questions) {
        ReviewSession session = new ReviewSession();
        session.setId(id);
        session.setUser(user);
        session.setExamType(examType);
        session.setCategories(categories);
        session.setTags(tags);
        List<ReviewSessionItem> items = new ArrayList<>();
        for (int i = 0; i < questions.length; i++) {
            ReviewSessionItem item = new ReviewSessionItem();
            item.setSession(session);
            item.setQuestion(questions[i]);
            item.setPosition(i + 1);
            items.add(item);
        }
        session.setItems(items);
        return session;
    }

    private void stubSavedSession() {
        lenient().when(reviewSessionRepository.save(any(ReviewSession.class))).thenAnswer(invocation -> {
            ReviewSession session = invocation.getArgument(0);
            if (session.getId() == null) {
                session.setId(100L);
            }
            return session;
        });
    }

    @Test
    @DisplayName("create falla si examTypeCode es nulo o vacío")
    void createRequiresExamTypeCode() {
        assertThatThrownBy(() -> service.create("demo",
                new CreateReviewSessionRequest(null, List.of(), List.of())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("El banco de preguntas es obligatorio");

        assertThatThrownBy(() -> service.create("demo",
                new CreateReviewSessionRequest("   ", List.of(), List.of())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("El banco de preguntas es obligatorio");

        verify(reviewSessionRepository, never()).save(any(ReviewSession.class));
    }

    @Test
    @DisplayName("un USER sin bancos asignados recibe 403 ForbiddenException al crear repaso")
    void createForbiddenWhenUserHasNoBanks() {
        ExamType mir = TestData.examType(1L, "MIR", "Médico Interno Residente");
        lenient().when(appUserService.requireByUsername("demo"))
                .thenReturn(TestData.user(1L, "demo", UserRole.USER));
        lenient().when(examTypeRepository.findByCode("MIR")).thenReturn(Optional.of(mir));
        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(false);
        when(accessControlService.allowedBankCodes("demo")).thenReturn(Set.of());

        assertThatThrownBy(() -> service.create("demo",
                new CreateReviewSessionRequest("MIR", List.of(), List.of())))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("ningún banco");

        verify(reviewSessionRepository, never()).save(any(ReviewSession.class));
    }

    @Test
    @DisplayName("un USER no puede crear un repaso en un banco no asignado")
    void createForbiddenForUnassignedBank() {
        ExamType bir = TestData.examType(2L, "BIR", "Biólogo Interno Residente");
        lenient().when(appUserService.requireByUsername("demo"))
                .thenReturn(TestData.user(1L, "demo", UserRole.USER));
        when(examTypeRepository.findByCode("BIR")).thenReturn(Optional.of(bir));
        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(false);
        when(accessControlService.allowedBankCodes("demo")).thenReturn(Set.of("MIR"));

        assertThatThrownBy(() -> service.create("demo",
                new CreateReviewSessionRequest("BIR", List.of(), List.of())))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("No tienes acceso al banco");

        verify(questionRepository, never()).findByExamTypeCode(any());
    }

    @Test
    @DisplayName("crea un repaso filtrando por múltiples categorías y múltiples tags, excluyendo invalidadas, con 1 ítem inicial ocultando respuesta correcta y explicación")
    void createFiltersByMultipleCategoriesAndTagsAndStartsWithOneItem() {
        ExamType mir = TestData.examType(1L, "MIR", "Médico Interno Residente");
        Question match1 = question(1L, mir, "Anatomía", "Tema 1, Huesos");
        Question match2 = question(2L, mir, "Fisiología", "Corazón, Tema 2");
        Question wrongCategory = question(3L, mir, "Pediatría", "Tema 1");
        Question wrongTag = question(4L, mir, "Anatomía", "Neurología");
        Question invalidated = TestData.question(5L, "Pregunta invalidada", mir,
                TestData.option("A", "Opción A", false),
                TestData.option("B", "Opción B", false));
        invalidated.setCategory("Anatomía");
        invalidated.setTag("Tema 1");

        when(appUserService.requireByUsername("demo"))
                .thenReturn(TestData.user(1L, "demo", UserRole.USER));
        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(true);
        when(examTypeRepository.findByCode("MIR")).thenReturn(Optional.of(mir));
        when(questionRepository.findByExamTypeCode("MIR"))
                .thenReturn(List.of(match1, match2, wrongCategory, wrongTag, invalidated));
        stubSavedSession();

        ReviewSessionResponse response = service.create("demo",
                new CreateReviewSessionRequest("MIR",
                        List.of("Anatomía", "Fisiología"),
                        List.of("Tema 1", "Tema 2")));

        assertThat(response.id()).isEqualTo(100L);
        assertThat(response.examTypeCode()).isEqualTo("MIR");
        assertThat(response.categories()).containsExactly("Anatomía", "Fisiología");
        assertThat(response.tags()).containsExactly("Tema 1", "Tema 2");
        assertThat(response.totalMatchingQuestions()).isEqualTo(2);
        assertThat(response.answeredCount()).isZero();
        assertThat(response.correctCount()).isZero();
        assertThat(response.accuracy()).isZero();
        assertThat(response.hasMoreQuestions()).isTrue();
        assertThat(response.finished()).isFalse();
        assertThat(response.items()).hasSize(1);

        FreeSessionResponse.Item firstItem = response.items().get(0);
        assertThat(firstItem.position()).isEqualTo(1);
        assertThat(firstItem.questionId()).isIn(1L, 2L);
        assertThat(firstItem.answered()).isFalse();
        assertThat(firstItem.selectedLetter()).isNull();
        assertThat(firstItem.correct()).isNull();
        assertThat(firstItem.correctLetter()).isNull();
        assertThat(firstItem.explanation()).isNull();
    }

    @Test
    @DisplayName("create falla si ninguna pregunta cumple el filtro seleccionado")
    void createThrowsWhenNoQuestionsMatchFilter() {
        ExamType mir = TestData.examType(1L, "MIR", "Médico Interno Residente");
        Question q1 = question(1L, mir, "Anatomía", "Tema 1");
        when(appUserService.requireByUsername("demo"))
                .thenReturn(TestData.user(1L, "demo", UserRole.USER));
        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(true);
        when(examTypeRepository.findByCode("MIR")).thenReturn(Optional.of(mir));
        when(questionRepository.findByExamTypeCode("MIR")).thenReturn(List.of(q1));

        assertThatThrownBy(() -> service.create("demo",
                new CreateReviewSessionRequest("MIR", List.of("Pediatría"), List.of())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("No hay preguntas que coincidan con el filtro seleccionado");
    }

    @Test
    @DisplayName("answer revela correcta y explicación, calcula estadísticas por categoría y añade la siguiente pregunta si quedan en el pool")
    void answerRevealsCorrectionAndAppendsNextQuestionWhenAvailable() {
        ExamType mir = TestData.examType(1L, "MIR", "Médico Interno Residente");
        AppUser user = TestData.user(1L, "demo", UserRole.USER);
        Question q1 = question(1L, mir, "Anatomía", "Tema 1");
        Question q2 = question(2L, mir, "Fisiología", "Tema 2");

        ReviewSession session = reviewSession(10L, user, mir, null, null, q1);
        when(reviewSessionRepository.findById(10L)).thenReturn(Optional.of(session));
        when(questionRepository.findByExamTypeCode("MIR")).thenReturn(List.of(q1, q2));
        stubSavedSession();

        // Responder la posición 1 correctamente (A)
        ReviewSessionResponse afterFirst = service.answer("demo", 10L, new AnswerRequest(1, "a"));

        assertThat(afterFirst.answeredCount()).isEqualTo(1);
        assertThat(afterFirst.correctCount()).isEqualTo(1);
        assertThat(afterFirst.accuracy()).isEqualTo(100d);
        assertThat(afterFirst.hasMoreQuestions()).isTrue();
        assertThat(afterFirst.finished()).isFalse();
        assertThat(afterFirst.byCategory())
                .singleElement()
                .satisfies(cat -> {
                    assertThat(cat.category()).isEqualTo("Anatomía");
                    assertThat(cat.answered()).isEqualTo(1);
                    assertThat(cat.correct()).isEqualTo(1);
                    assertThat(cat.accuracy()).isEqualTo(100d);
                });

        // Se ha añadido la siguiente pregunta (q2) en posición 2 sin responder
        assertThat(afterFirst.items()).hasSize(2);
        FreeSessionResponse.Item item1 = afterFirst.items().get(0);
        assertThat(item1.answered()).isTrue();
        assertThat(item1.selectedLetter()).isEqualTo("A");
        assertThat(item1.correct()).isTrue();
        assertThat(item1.correctLetter()).isEqualTo("A");
        assertThat(item1.explanation()).isEqualTo("Explicación 1");

        FreeSessionResponse.Item item2 = afterFirst.items().get(1);
        assertThat(item2.position()).isEqualTo(2);
        assertThat(item2.questionId()).isEqualTo(2L);
        assertThat(item2.answered()).isFalse();
        assertThat(item2.correctLetter()).isNull();
        assertThat(item2.explanation()).isNull();

        // Responder la posición 2 (última disponible en el pool) incorrectamente (B)
        ReviewSessionResponse afterSecond = service.answer("demo", 10L, new AnswerRequest(2, "B"));

        assertThat(afterSecond.answeredCount()).isEqualTo(2);
        assertThat(afterSecond.correctCount()).isEqualTo(1);
        assertThat(afterSecond.accuracy()).isEqualTo(50d);
        assertThat(afterSecond.hasMoreQuestions()).isFalse();
        assertThat(afterSecond.items()).hasSize(2);
        assertThat(afterSecond.byCategory())
                .extracting(StatsOverviewResponse.CategoryStats::category)
                .containsExactly("Anatomía", "Fisiología");
    }

    @Test
    @DisplayName("answer rechaza responder dos veces la misma posición, letra inválida o repaso ya finalizado")
    void answerValidatesDuplicateAnswerInvalidLetterAndFinishedSession() {
        ExamType mir = TestData.examType(1L, "MIR", "Médico Interno Residente");
        AppUser user = TestData.user(1L, "demo", UserRole.USER);
        Question q1 = question(1L, mir, "Anatomía", "Tema 1");
        ReviewSession session = reviewSession(10L, user, mir, null, null, q1);
        when(reviewSessionRepository.findById(10L)).thenReturn(Optional.of(session));
        lenient().when(questionRepository.findByExamTypeCode("MIR")).thenReturn(List.of(q1));

        // Letra inválida
        assertThatThrownBy(() -> service.answer("demo", 10L, new AnswerRequest(1, "Z")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Opción no válida");

        // Ya respondida
        session.getItems().get(0).setAnsweredAt(LocalDateTime.now());
        assertThatThrownBy(() -> service.answer("demo", 10L, new AnswerRequest(1, "A")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ya ha sido respondida");

        // Repaso ya finalizado
        session.setFinishedAt(LocalDateTime.now());
        assertThatThrownBy(() -> service.answer("demo", 10L, new AnswerRequest(1, "A")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ya ha finalizado");
    }

    @Test
    @DisplayName("finish marca finished=true, elimina el ítem pendiente no respondido y devuelve estadísticas generales y por categorías")
    void finishRemovesUnansweredItemAndMarksSessionFinished() {
        ExamType mir = TestData.examType(1L, "MIR", "Médico Interno Residente");
        AppUser user = TestData.user(1L, "demo", UserRole.USER);
        Question q1 = question(1L, mir, "Anatomía", "Tema 1");
        Question q2 = question(2L, mir, "Fisiología", "Tema 2");
        Question q3 = question(3L, mir, "Anatomía", "Tema 3");

        ReviewSession session = reviewSession(10L, user, mir, null, null, q1, q2, q3);
        // q1 respondida correcta, q2 respondida incorrecta, q3 pendiente sin responder
        ReviewSessionItem item1 = session.getItems().get(0);
        item1.setSelectedLetter("A");
        item1.setIsCorrect(true);
        item1.setAnsweredAt(LocalDateTime.now());

        ReviewSessionItem item2 = session.getItems().get(1);
        item2.setSelectedLetter("B");
        item2.setIsCorrect(false);
        item2.setAnsweredAt(LocalDateTime.now());

        when(reviewSessionRepository.findById(10L)).thenReturn(Optional.of(session));
        lenient().when(questionRepository.findByExamTypeCode("MIR")).thenReturn(List.of(q1, q2, q3));
        stubSavedSession();

        ReviewSessionResponse finished = service.finish("demo", 10L);

        assertThat(finished.finished()).isTrue();
        assertThat(finished.hasMoreQuestions()).isFalse();
        assertThat(finished.answeredCount()).isEqualTo(2);
        assertThat(finished.correctCount()).isEqualTo(1);
        assertThat(finished.accuracy()).isEqualTo(50d);
        assertThat(finished.items()).hasSize(2);
        assertThat(finished.byCategory())
                .extracting(StatsOverviewResponse.CategoryStats::category)
                .containsExactly("Anatomía", "Fisiología");
        verify(reviewSessionRepository).save(session);
    }

    @Test
    @DisplayName("listActive devuelve los repasos en curso del usuario con sus contadores")
    void listActiveReturnsActiveReviewSessions() {
        ExamType mir = TestData.examType(1L, "MIR", "Médico Interno Residente");
        AppUser user = TestData.user(1L, "demo", UserRole.USER);
        Question q1 = question(1L, mir, "Anatomía", "Tema 1");
        Question q2 = question(2L, mir, "Anatomía", "Tema 2");

        ReviewSession session = reviewSession(15L, user, mir, "Anatomía", "Tema 1\nTema 2", q1, q2);
        session.getItems().get(0).setSelectedLetter("A");
        session.getItems().get(0).setIsCorrect(true);
        session.getItems().get(0).setAnsweredAt(LocalDateTime.now());

        when(reviewSessionRepository.findActiveByUsername("demo")).thenReturn(List.of(session));
        lenient().when(questionRepository.findByExamTypeCode("MIR")).thenReturn(List.of(q1, q2));

        List<ReviewSessionSummaryResponse> active = service.listActive("demo");

        assertThat(active).singleElement().satisfies(summary -> {
            assertThat(summary.id()).isEqualTo(15L);
            assertThat(summary.examTypeCode()).isEqualTo("MIR");
            assertThat(summary.categories()).containsExactly("Anatomía");
            assertThat(summary.tags()).containsExactly("Tema 1", "Tema 2");
            assertThat(summary.answeredCount()).isEqualTo(1);
            assertThat(summary.correctCount()).isEqualTo(1);
            assertThat(summary.totalMatchingQuestions()).isEqualTo(2);
            assertThat(summary.finished()).isFalse();
        });
    }

    @Test
    @DisplayName("filters devuelve categorías y tags distintos del banco indicado verificando permisos")
    void filtersReturnsDistinctCategoriesAndTagsForBank() {
        ExamType mir = TestData.examType(1L, "MIR", "Médico Interno Residente");
        Question q1 = question(1L, mir, "Fisiología", "Corazón, Pulmón");
        Question q2 = question(2L, mir, "Anatomía", "Huesos, Corazón");

        when(examTypeRepository.findByCode("MIR")).thenReturn(Optional.of(mir));
        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(false);
        when(accessControlService.allowedBankCodes("demo")).thenReturn(Set.of("MIR"));
        when(questionRepository.findByExamTypeCode("MIR")).thenReturn(List.of(q1, q2));

        ReviewFiltersResponse filters = service.filters("demo", "MIR");

        assertThat(filters.categories()).containsExactly("Anatomía", "Fisiología");
        assertThat(filters.tags()).containsExactly("Corazón", "Huesos", "Pulmón");
    }

    @Test
    @DisplayName("no permite acceder a un repaso de otro usuario")
    void getRejectsSessionOfAnotherUser() {
        ExamType mir = TestData.examType(1L, "MIR", "Médico Interno Residente");
        ReviewSession session = reviewSession(10L,
                TestData.user(2L, "otro", UserRole.USER), mir, null, null,
                question(1L, mir, "Anatomía", "Tema 1"));
        when(reviewSessionRepository.findById(10L)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.get("demo", 10L))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("Repaso no encontrado");
    }
}
