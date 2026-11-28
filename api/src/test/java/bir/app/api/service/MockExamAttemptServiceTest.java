package bir.app.api.service;

import bir.app.api.dto.AnswerRequest;
import bir.app.api.dto.MockExamAttemptResponse;
import bir.app.api.entity.AppUser;
import bir.app.api.entity.ExamType;
import bir.app.api.entity.MockExam;
import bir.app.api.entity.MockExamAttempt;
import bir.app.api.entity.Question;
import bir.app.api.entity.UserRole;
import bir.app.api.repository.MockExamAttemptRepository;
import bir.app.api.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("MockExamAttemptService")
class MockExamAttemptServiceTest {

    @Mock
    MockExamAttemptRepository attemptRepository;
    @Mock
    MockExamService mockExamService;
    @Mock
    AppUserService appUserService;
    @Mock
    UserQuestionStatusService userQuestionStatusService;

    MockExamAttemptService service;

    @BeforeEach
    void setUp() {
        service = new MockExamAttemptService(attemptRepository, mockExamService, appUserService, userQuestionStatusService);
    }

    @Test
    @DisplayName("permite responder una pregunta invalidada en un simulacro pero no cuenta la respuesta ni penaliza la nota")
    void invalidatedQuestionInMockExamDoesNotCountTowardsScore() {
        ExamType mir = TestData.examType(1L, "MIR", "MIR");
        AppUser demo = TestData.user(1L, "demo", UserRole.USER);
        Question valid1 = TestData.question(1L, "Pregunta válida 1", mir,
                TestData.option("A", "Correcta A", true),
                TestData.option("B", "Incorrecta B", false));
        Question valid2 = TestData.question(2L, "Pregunta válida 2", mir,
                TestData.option("A", "Correcta A", true),
                TestData.option("B", "Incorrecta B", false));
        Question invalidated = TestData.question(3L, "Pregunta invalidada", mir,
                TestData.option("A", "Opción A", false),
                TestData.option("B", "Opción B", false));

        MockExam exam = TestData.mockExam(10L, "Simulacro Oficial MIR", mir, valid1, valid2, invalidated);
        when(mockExamService.requireVisible("demo", 10L)).thenReturn(exam);
        when(appUserService.requireByUsername("demo")).thenReturn(demo);

        final MockExamAttempt[] holder = new MockExamAttempt[1];
        when(attemptRepository.save(any(MockExamAttempt.class))).thenAnswer(invocation -> {
            MockExamAttempt saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(50L);
            }
            holder[0] = saved;
            return saved;
        });

        MockExamAttemptResponse started = service.start("demo", 10L);
        assertThat(started.totalQuestions()).isEqualTo(3);

        when(attemptRepository.findByIdAndUsername(50L, "demo"))
                .thenAnswer(inv -> Optional.ofNullable(holder[0]));

        // Responde bien la 1, mal la 2, y responde la 3 (invalidada)
        service.answer("demo", 50L, new AnswerRequest(1, "A"));
        service.answer("demo", 50L, new AnswerRequest(2, "B"));
        MockExamAttemptResponse afterAnswers = service.answer("demo", 50L, new AnswerRequest(3, "A"));

        // Durante el intento no se revela cuál está invalidada
        assertThat(afterAnswers.answeredCount()).isEqualTo(3);
        assertThat(afterAnswers.items().get(2).answered()).isTrue();
        assertThat(afterAnswers.items().get(2).selectedLetter()).isEqualTo("A");
        assertThat(afterAnswers.items().get(2).correct()).isNull();
        assertThat(afterAnswers.items().get(2).correctLetter()).isNull();

        // Al entregar: 1 acierto sobre 2 preguntas válidas => 50.0%
        MockExamAttemptResponse finished = service.finish("demo", 50L);
        assertThat(finished.finished()).isTrue();
        assertThat(finished.correctCount()).isEqualTo(1);
        assertThat(finished.accuracy()).isEqualTo(50.0d);

        MockExamAttemptResponse.Item invItem = finished.items().get(2);
        assertThat(invItem.correctLetter()).isNull();
        assertThat(invItem.correct()).isNull();
        assertThat(invItem.selectedLetter()).isEqualTo("A");

        verify(userQuestionStatusService).recordAnswer(demo, valid1, true);
        verify(userQuestionStatusService).recordAnswer(demo, valid2, false);
        verify(userQuestionStatusService, never()).recordAnswer(demo, invalidated, true);
        verify(userQuestionStatusService, never()).recordAnswer(demo, invalidated, false);
    }
}
