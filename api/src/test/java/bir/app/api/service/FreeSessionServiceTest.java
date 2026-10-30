package bir.app.api.service;

import bir.app.api.dto.AnswerRequest;
import bir.app.api.dto.CreateFreeSessionRequest;
import bir.app.api.dto.FreeSessionResponse;
import bir.app.api.dto.QuizStatsResponse;
import bir.app.api.entity.ExamType;
import bir.app.api.entity.FreeSession;
import bir.app.api.entity.Question;
import bir.app.api.entity.SessionItem;
import bir.app.api.entity.UserRole;
import bir.app.api.exception.ForbiddenException;
import bir.app.api.repository.ExamTypeRepository;
import bir.app.api.repository.FreeSessionRepository;
import bir.app.api.repository.QuestionRepository;
import bir.app.api.repository.SessionItemRepository;
import bir.app.api.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("FreeSessionService")
class FreeSessionServiceTest {

    @Mock
    FreeSessionRepository freeSessionRepository;
    @Mock
    SessionItemRepository sessionItemRepository;
    @Mock
    QuestionRepository questionRepository;
    @Mock
    ExamTypeRepository examTypeRepository;
    @Mock
    AppUserService appUserService;
    @Mock
    AccessControlService accessControlService;

    FreeSessionService service;

    @BeforeEach
    void setUp() {
        service = new FreeSessionService(freeSessionRepository, sessionItemRepository, questionRepository,
                examTypeRepository, appUserService, accessControlService);
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

    private void stubSavedSession() {
        when(freeSessionRepository.save(any(FreeSession.class))).thenAnswer(invocation -> {
            FreeSession session = invocation.getArgument(0);
            session.setId(100L);
            return session;
        });
    }

    @Test
    @DisplayName("crea una partida filtrando por categoría y tag")
    void createFiltersByCategoryAndTag() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        Question match = question(1L, examType, "Anatomía", "Tema 1");
        Question otherTag = question(2L, examType, "Anatomía", "Tema 2");
        Question otherCategory = question(3L, examType, "Fisiología", "Tema 1");
        when(appUserService.requireByUsername("demo"))
                .thenReturn(TestData.user(1L, "demo", UserRole.USER));
        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(true);
        when(examTypeRepository.findByCode("MIR")).thenReturn(Optional.of(examType));
        when(questionRepository.findByExamTypeCode("MIR"))
                .thenReturn(List.of(match, otherTag, otherCategory));
        stubSavedSession();

        FreeSessionResponse response = service.create("demo",
                new CreateFreeSessionRequest("MIR", "anatomía", "tema 1", 10));

        assertThat(response.totalQuestions()).isEqualTo(1);
        assertThat(response.category()).isEqualTo("anatomía");
        assertThat(response.tag()).isEqualTo("tema 1");
        assertThat(response.items()).extracting(FreeSessionResponse.Item::questionId).containsExactly(1L);
    }

    @Test
    @DisplayName("recorta el número de preguntas al tamaño del pool disponible")
    void createLimitsCountToPool() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        List<Question> pool = List.of(
                question(1L, examType, null, null),
                question(2L, examType, null, null),
                question(3L, examType, null, null));
        when(appUserService.requireByUsername("demo"))
                .thenReturn(TestData.user(1L, "demo", UserRole.USER));
        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(true);
        when(examTypeRepository.findByCode("MIR")).thenReturn(Optional.of(examType));
        when(questionRepository.findByExamTypeCode("MIR")).thenReturn(pool);
        stubSavedSession();

        FreeSessionResponse response = service.create("demo",
                new CreateFreeSessionRequest("MIR", null, null, 10));

        assertThat(response.totalQuestions()).isEqualTo(3);
        assertThat(response.answeredCount()).isZero();
    }

    @Test
    @DisplayName("un USER sin bancos asignados recibe un 403")
    void createForbiddenWhenUserHasNoBanks() {
        when(appUserService.requireByUsername("demo"))
                .thenReturn(TestData.user(1L, "demo", UserRole.USER));
        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(false);
        when(accessControlService.allowedBankCodes("demo")).thenReturn(Set.of());

        assertThatThrownBy(() -> service.create("demo",
                new CreateFreeSessionRequest(null, null, null, 5)))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("ningún banco");

        verify(freeSessionRepository, never()).save(any(FreeSession.class));
    }

    @Test
    @DisplayName("un USER no puede usar un banco que no tiene asignado")
    void createForbiddenForUnalignedBank() {
        ExamType bir = TestData.examType(2L, "BIR", "BIR");
        when(appUserService.requireByUsername("demo"))
                .thenReturn(TestData.user(1L, "demo", UserRole.USER));
        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(false);
        when(accessControlService.allowedBankCodes("demo")).thenReturn(Set.of("MIR"));
        when(examTypeRepository.findByCode("BIR")).thenReturn(Optional.of(bir));

        assertThatThrownBy(() -> service.create("demo",
                new CreateFreeSessionRequest("BIR", null, null, 5)))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("No tienes acceso al banco");

        verify(questionRepository, never()).findByExamTypeCode(any());
    }

    @Test
    @DisplayName("un USER sin banco seleccionado usa solo sus bancos asignados")
    void createWithoutBankUsesAllowedBanks() {
        ExamType mir = TestData.examType(1L, "MIR", "MIR");
        Question question = question(1L, mir, null, null);
        when(appUserService.requireByUsername("demo"))
                .thenReturn(TestData.user(1L, "demo", UserRole.USER));
        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(false);
        when(accessControlService.allowedBankCodes("demo")).thenReturn(Set.of("MIR"));
        when(questionRepository.findByExamTypeCodeIn(anySet())).thenReturn(List.of(question));
        stubSavedSession();

        FreeSessionResponse response = service.create("demo",
                new CreateFreeSessionRequest(null, null, null, 5));

        assertThat(response.totalQuestions()).isEqualTo(1);
    }

    @Test
    @DisplayName("falla si el filtro no deja ninguna pregunta")
    void createWithoutMatchingQuestions() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        Question question = question(1L, examType, "Anatomía", null);
        when(appUserService.requireByUsername("demo"))
                .thenReturn(TestData.user(1L, "demo", UserRole.USER));
        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(true);
        when(examTypeRepository.findByCode("MIR")).thenReturn(Optional.of(examType));
        when(questionRepository.findByExamTypeCode("MIR")).thenReturn(List.of(question));

        assertThatThrownBy(() -> service.create("demo",
                new CreateFreeSessionRequest("MIR", "Pediatría", null, 5)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("No hay preguntas");
    }

    @Test
    @DisplayName("no revela la correcta ni la explicación antes de responder")
    void getHidesCorrectAnswerAndExplanation() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        FreeSession session = TestData.freeSession(10L,
                TestData.user(1L, "demo", UserRole.USER), examType, null, "Tema 1",
                question(1L, examType, "Anatomía", "Tema 1"));
        when(freeSessionRepository.findById(10L)).thenReturn(Optional.of(session));

        FreeSessionResponse response = service.get("demo", 10L);

        FreeSessionResponse.Item item = response.items().get(0);
        assertThat(item.answered()).isFalse();
        assertThat(item.correctLetter()).isNull();
        assertThat(item.explanation()).isNull();
        assertThat(item.correct()).isNull();
        assertThat(response.tag()).isEqualTo("Tema 1");
    }

    @Test
    @DisplayName("al responder revela la correcta y la explicación, y marca la sesión como terminada")
    void answerRevealsCorrectAnswerAndFinishesSession() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        FreeSession session = TestData.freeSession(10L,
                TestData.user(1L, "demo", UserRole.USER), examType, null, null,
                question(1L, examType, null, null));
        when(freeSessionRepository.findById(10L)).thenReturn(Optional.of(session));
        stubSavedSession();

        FreeSessionResponse response = service.answer("demo", 10L, new AnswerRequest(1, "b"));

        FreeSessionResponse.Item item = response.items().get(0);
        assertThat(item.answered()).isTrue();
        assertThat(item.selectedLetter()).isEqualTo("B");
        assertThat(item.correct()).isFalse();
        assertThat(item.correctLetter()).isEqualTo("A");
        assertThat(item.explanation()).isEqualTo("Explicación 1");
        assertThat(response.finished()).isTrue();
        verify(freeSessionRepository).save(session);
    }

    @Test
    @DisplayName("solo marca la sesión como terminada cuando se han respondido todas")
    void answerFinishesOnlyWhenAllItemsAnswered() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        FreeSession session = TestData.freeSession(10L,
                TestData.user(1L, "demo", UserRole.USER), examType, null, null,
                question(1L, examType, null, null),
                question(2L, examType, null, null));
        when(freeSessionRepository.findById(10L)).thenReturn(Optional.of(session));
        stubSavedSession();

        FreeSessionResponse first = service.answer("demo", 10L, new AnswerRequest(1, "A"));
        FreeSessionResponse second = service.answer("demo", 10L, new AnswerRequest(2, "A"));

        assertThat(first.finished()).isFalse();
        assertThat(first.answeredCount()).isEqualTo(1);
        assertThat(second.finished()).isTrue();
        assertThat(second.answeredCount()).isEqualTo(2);
        assertThat(second.correctCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("rechaza una letra que no existe en la pregunta")
    void answerWithInvalidLetter() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        FreeSession session = TestData.freeSession(10L,
                TestData.user(1L, "demo", UserRole.USER), examType, null, null,
                question(1L, examType, null, null));
        when(freeSessionRepository.findById(10L)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.answer("demo", 10L, new AnswerRequest(1, "Z")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Opción no válida");
    }

    @Test
    @DisplayName("rechaza responder dos veces la misma pregunta")
    void answerTwiceSameItem() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        FreeSession session = TestData.freeSession(10L,
                TestData.user(1L, "demo", UserRole.USER), examType, null, null,
                question(1L, examType, null, null));
        SessionItem item = session.getItems().get(0);
        item.setAnsweredAt(LocalDateTime.now());
        when(freeSessionRepository.findById(10L)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.answer("demo", 10L, new AnswerRequest(1, "A")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ya ha sido respondida");
    }

    @Test
    @DisplayName("no permite ver una sesión de otro usuario")
    void getSessionOfAnotherUser() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        FreeSession session = TestData.freeSession(10L,
                TestData.user(2L, "otro", UserRole.USER), examType, null, null,
                question(1L, examType, null, null));
        when(freeSessionRepository.findById(10L)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.get("demo", 10L))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("Sesión no encontrada");
    }

    @Test
    @DisplayName("calcula las estadísticas propias y globales con porcentaje")
    void calculatesQuizStats() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        Question question = question(1L, examType, null, null);
        SessionItem correct = new SessionItem();
        correct.setQuestion(question);
        correct.setPosition(1);
        correct.setAnsweredAt(LocalDateTime.now());
        correct.setIsCorrect(true);
        SessionItem wrong = new SessionItem();
        wrong.setQuestion(question);
        wrong.setPosition(2);
        wrong.setAnsweredAt(LocalDateTime.now());
        wrong.setIsCorrect(false);
        List<SessionItem> answered = List.of(correct, wrong);

        when(freeSessionRepository.countByUserUsername("demo")).thenReturn(2L);
        when(sessionItemRepository.findAnsweredByUsername("demo")).thenReturn(answered);
        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(true);
        when(freeSessionRepository.countDistinctUsers()).thenReturn(3L);
        when(freeSessionRepository.count()).thenReturn(5L);
        when(sessionItemRepository.findAllAnswered()).thenReturn(answered);

        QuizStatsResponse response = service.stats("demo");

        assertThat(response.mine().sessions()).isEqualTo(2);
        assertThat(response.mine().answered()).isEqualTo(2);
        assertThat(response.mine().correct()).isEqualTo(1);
        assertThat(response.mine().accuracy()).isEqualTo(50d);
        assertThat(response.global().users()).isEqualTo(3);
        assertThat(response.global().sessions()).isEqualTo(5);
        assertThat(response.global().accuracy()).isEqualTo(50d);
        assertThat(response.mine().byExamType()).singleElement().satisfies(stats -> {
            assertThat(stats.code()).isEqualTo("MIR");
            assertThat(stats.answered()).isEqualTo(2);
            assertThat(stats.correct()).isEqualTo(1);
            assertThat(stats.accuracy()).isEqualTo(50d);
        });
    }

    @Test
    @DisplayName("un USER no recibe el resumen global")
    void userDoesNotReceiveGlobalStats() {
        ExamType examType = TestData.examType(1L, "EIT", "EIR");
        SessionItem item = new SessionItem();
        item.setQuestion(question(1L, examType, null, null));
        item.setPosition(1);
        item.setAnsweredAt(LocalDateTime.now());
        item.setIsCorrect(true);

        when(freeSessionRepository.countByUserUsername("demo")).thenReturn(1L);
        when(sessionItemRepository.findAnsweredByUsername("demo")).thenReturn(List.of(item));
        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(false);

        QuizStatsResponse response = service.stats("demo");

        assertThat(response.mine().answered()).isEqualTo(1);
        assertThat(response.global()).isNull();
        verify(sessionItemRepository, never()).findAllAnswered();
    }
}
