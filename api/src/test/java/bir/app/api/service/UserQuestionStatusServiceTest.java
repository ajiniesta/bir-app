package bir.app.api.service;

import bir.app.api.dto.QuestionPageResponse;
import bir.app.api.dto.QuestionResponse;
import bir.app.api.entity.AppUser;
import bir.app.api.entity.ExamType;
import bir.app.api.entity.Question;
import bir.app.api.entity.QuestionLearningStatus;
import bir.app.api.entity.UserQuestionStatus;
import bir.app.api.entity.UserRole;
import bir.app.api.exception.ForbiddenException;
import bir.app.api.repository.QuestionRepository;
import bir.app.api.repository.UserQuestionStatusRepository;
import bir.app.api.support.TestData;
import io.micronaut.data.model.Page;
import io.micronaut.data.model.Pageable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserQuestionStatusService")
class UserQuestionStatusServiceTest {

    @Mock
    UserQuestionStatusRepository statusRepository;
    @Mock
    QuestionRepository questionRepository;
    @Mock
    AccessControlService accessControlService;
    @Mock
    AppUserService appUserService;

    UserQuestionStatusService service;

    private final Map<String, UserQuestionStatus> inMemoryStore = new HashMap<>();

    @BeforeEach
    void setUp() {
        inMemoryStore.clear();
        service = new UserQuestionStatusService(statusRepository, questionRepository, accessControlService, appUserService);

        lenient().when(statusRepository.findByUserIdAndQuestionId(any(), any())).thenAnswer(inv -> {
            Long userId = inv.getArgument(0);
            Long questionId = inv.getArgument(1);
            return Optional.ofNullable(inMemoryStore.get(userId + ":" + questionId));
        });
        lenient().when(statusRepository.save(any(UserQuestionStatus.class))).thenAnswer(inv -> {
            UserQuestionStatus s = inv.getArgument(0);
            if (s.getId() == null) {
                s.setId((long) (inMemoryStore.size() + 1));
            }
            inMemoryStore.put(s.getUser().getId() + ":" + s.getQuestion().getId(), s);
            return s;
        });
        lenient().when(statusRepository.update(any(UserQuestionStatus.class))).thenAnswer(inv -> {
            UserQuestionStatus s = inv.getArgument(0);
            inMemoryStore.put(s.getUser().getId() + ":" + s.getQuestion().getId(), s);
            return s;
        });
    }

    private static Question sampleQuestion(long id) {
        ExamType mir = TestData.examType(1L, "MIR", "Médico Interno Residente");
        Question q = TestData.question(id, "¿Pregunta " + id + "?", mir,
                TestData.option("A", "Opción A", true),
                TestData.option("B", "Opción B", false));
        q.setCategory("Cardiología");
        q.setTag("ecg");
        q.setExplanation("Explicación " + id);
        return q;
    }

    @Test
    @DisplayName("primera vez que se responde: si acierta va a KNOWN, si falla va a FAILED")
    void firstTimeAnswerTransitions() {
        AppUser user = TestData.user(1L, "demo", UserRole.USER);
        Question q1 = sampleQuestion(10L);
        Question q2 = sampleQuestion(20L);

        UserQuestionStatus s1 = service.recordAnswer(user, q1, true);
        assertThat(s1.getStatus()).isEqualTo(QuestionLearningStatus.KNOWN);
        assertThat(s1.getConsecutiveCorrect()).isEqualTo(1);

        UserQuestionStatus s2 = service.recordAnswer(user, q2, false);
        assertThat(s2.getStatus()).isEqualTo(QuestionLearningStatus.FAILED);
        assertThat(s2.getConsecutiveCorrect()).isZero();
    }

    @Test
    @DisplayName("pregunta en KNOWN: si acierta sigue en KNOWN, si falla pasa a DOUBT")
    void knownQuestionTransitions() {
        AppUser user = TestData.user(1L, "demo", UserRole.USER);
        Question q = sampleQuestion(10L);

        // 1ª vez: acierta -> KNOWN
        service.recordAnswer(user, q, true);

        // Siguiente vez en KNOWN: acierta -> sigue en KNOWN
        UserQuestionStatus afterSecondCorrect = service.recordAnswer(user, q, true);
        assertThat(afterSecondCorrect.getStatus()).isEqualTo(QuestionLearningStatus.KNOWN);
        assertThat(afterSecondCorrect.getConsecutiveCorrect()).isEqualTo(2);

        // Siguiente vez en KNOWN: falla -> pasa a DOUBT con racha 0
        UserQuestionStatus afterFail = service.recordAnswer(user, q, false);
        assertThat(afterFail.getStatus()).isEqualTo(QuestionLearningStatus.DOUBT);
        assertThat(afterFail.getConsecutiveCorrect()).isZero();
    }

    @Test
    @DisplayName("pregunta en FAILED: si falla sigue en FAILED, si acierta pasa a DOUBT")
    void failedQuestionTransitions() {
        AppUser user = TestData.user(1L, "demo", UserRole.USER);
        Question q = sampleQuestion(10L);

        // 1ª vez: falla -> FAILED
        service.recordAnswer(user, q, false);

        // Siguiente vez en FAILED: falla -> sigue en FAILED
        UserQuestionStatus afterSecondFail = service.recordAnswer(user, q, false);
        assertThat(afterSecondFail.getStatus()).isEqualTo(QuestionLearningStatus.FAILED);
        assertThat(afterSecondFail.getConsecutiveCorrect()).isZero();

        // Siguiente vez en FAILED: acierta -> pasa a DOUBT (1 acierto en las últimas respuestas)
        UserQuestionStatus afterCorrect = service.recordAnswer(user, q, true);
        assertThat(afterCorrect.getStatus()).isEqualTo(QuestionLearningStatus.DOUBT);
        assertThat(afterCorrect.getConsecutiveCorrect()).isEqualTo(1);
    }

    @Test
    @DisplayName("pregunta en DOUBT (desde FAILED): requiere que las 3 últimas respuestas sean acertadas para pasar a KNOWN")
    void doubtFromFailedGraduatesToKnownAfterThreeLastAnswersAreCorrect() {
        AppUser user = TestData.user(1L, "demo", UserRole.USER);
        Question q = sampleQuestion(10L);

        // 1ª respuesta: Falla -> FAILED ([F])
        service.recordAnswer(user, q, false);

        // 2ª respuesta: Acierta -> pasa a DOUBT ([F, T], racha = 1)
        UserQuestionStatus step2 = service.recordAnswer(user, q, true);
        assertThat(step2.getStatus()).isEqualTo(QuestionLearningStatus.DOUBT);
        assertThat(step2.getConsecutiveCorrect()).isEqualTo(1);

        // 3ª respuesta (estando en DOUBT): Acierta -> últimas 3 son [F, T, T] (hay 1 fallida) -> sigue en DOUBT (racha = 2)
        UserQuestionStatus step3 = service.recordAnswer(user, q, true);
        assertThat(step3.getStatus()).isEqualTo(QuestionLearningStatus.DOUBT);
        assertThat(step3.getConsecutiveCorrect()).isEqualTo(2);

        // 4ª respuesta (estando en DOUBT): Acierta -> últimas 3 son [T, T, T] (todas acertadas) -> pasa a KNOWN (racha = 3)
        UserQuestionStatus step4 = service.recordAnswer(user, q, true);
        assertThat(step4.getStatus()).isEqualTo(QuestionLearningStatus.KNOWN);
        assertThat(step4.getConsecutiveCorrect()).isEqualTo(3);
    }

    @Test
    @DisplayName("pregunta en DOUBT (desde KNOWN): al fallar nunca vuelve a FAILED y requiere 3 aciertos seguidos para volver a KNOWN")
    void doubtFromKnownStaysInDoubtOnFailureAndRequiresThreeConsecutiveCorrects() {
        AppUser user = TestData.user(1L, "demo", UserRole.USER);
        Question q = sampleQuestion(10L);

        // 1ª respuesta: Acierta -> KNOWN ([T])
        service.recordAnswer(user, q, true);
        // 2ª respuesta: Falla -> DOUBT ([T, F], racha = 0)
        service.recordAnswer(user, q, false);

        // 3ª respuesta: Falla estando en DOUBT -> sigue en DOUBT, NO pasa a FAILED
        UserQuestionStatus afterFailInDoubt = service.recordAnswer(user, q, false);
        assertThat(afterFailInDoubt.getStatus()).isEqualTo(QuestionLearningStatus.DOUBT);
        assertThat(afterFailInDoubt.getConsecutiveCorrect()).isZero();

        // Acierto 1 en DOUBT ([F, F, T]) -> sigue en DOUBT
        assertThat(service.recordAnswer(user, q, true).getStatus())
                .isEqualTo(QuestionLearningStatus.DOUBT);
        // Acierto 2 en DOUBT ([F, T, T]) -> sigue en DOUBT
        assertThat(service.recordAnswer(user, q, true).getStatus())
                .isEqualTo(QuestionLearningStatus.DOUBT);
        // Si falla aquí ([T, T, F]) -> sigue en DOUBT y reinicia racha
        UserQuestionStatus resetInDoubt = service.recordAnswer(user, q, false);
        assertThat(resetInDoubt.getStatus()).isEqualTo(QuestionLearningStatus.DOUBT);
        assertThat(resetInDoubt.getConsecutiveCorrect()).isZero();

        // Ahora 3 aciertos seguidos ([T, T, T]) -> pasa a KNOWN
        assertThat(service.recordAnswer(user, q, true).getStatus()).isEqualTo(QuestionLearningStatus.DOUBT);
        assertThat(service.recordAnswer(user, q, true).getStatus()).isEqualTo(QuestionLearningStatus.DOUBT);
        UserQuestionStatus graduated = service.recordAnswer(user, q, true);
        assertThat(graduated.getStatus()).isEqualTo(QuestionLearningStatus.KNOWN);
        assertThat(graduated.getConsecutiveCorrect()).isEqualTo(3);
    }

    @Test
    @DisplayName("searchDoubtQuestions devuelve página paginada de preguntas en DOUBT y FAILED (o filtrada por status) con learningStatus")
    void searchDoubtQuestionsReturnsPaginatedDoubtAndFailedQuestions() {
        AppUser user = TestData.user(1L, "demo", UserRole.USER);
        Question q1 = sampleQuestion(10L);
        Question q2 = sampleQuestion(20L);
        UserQuestionStatus uqs1 = new UserQuestionStatus(user, q1, QuestionLearningStatus.DOUBT, 1);
        UserQuestionStatus uqs2 = new UserQuestionStatus(user, q2, QuestionLearningStatus.FAILED, 0);

        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(false);
        when(accessControlService.allowedBankCodes("demo")).thenReturn(Set.of("MIR"));
        when(statusRepository.searchByUsernameAndStatuses(
                eq("demo"),
                eq(List.of(QuestionLearningStatus.DOUBT, QuestionLearningStatus.FAILED)),
                eq(Set.of("MIR")),
                eq("MIR"),
                eq("Cardiología"),
                eq("ecg"),
                eq("%pregunta%"),
                any(Pageable.class)))
                .thenReturn(Page.of(List.of(uqs1, uqs2), Pageable.from(0, 20), 2L));

        QuestionPageResponse page = service.searchDoubtQuestions(
                "demo", 1, 20, "Pregunta", "MIR", "Cardiología", "ecg", null);

        assertThat(page.total()).isEqualTo(2L);
        assertThat(page.page()).isEqualTo(1);
        assertThat(page.items()).hasSize(2);
        assertThat(page.items().get(0).id()).isEqualTo(10L);
        assertThat(page.items().get(0).learningStatus()).isEqualTo("DOUBT");
        assertThat(page.items().get(1).id()).isEqualTo(20L);
        assertThat(page.items().get(1).learningStatus()).isEqualTo("FAILED");

        // Filtrando explícitamente por FAILED
        when(statusRepository.searchByUsernameAndStatuses(
                eq("demo"),
                eq(List.of(QuestionLearningStatus.FAILED)),
                eq(Set.of("MIR")),
                eq("MIR"),
                eq(""),
                eq(""),
                eq("%%"),
                any(Pageable.class)))
                .thenReturn(Page.of(List.of(uqs2), Pageable.from(0, 20), 1L));

        QuestionPageResponse failedOnly = service.searchDoubtQuestions(
                "demo", 1, 20, null, "MIR", null, null, "FAILED");
        assertThat(failedOnly.items()).singleElement().satisfies(item -> {
            assertThat(item.id()).isEqualTo(20L);
            assertThat(item.learningStatus()).isEqualTo("FAILED");
        });
    }

    @Test
    @DisplayName("getDoubtQuestionDetail devuelve el detalle si la pregunta está en DOUBT o FAILED para el usuario y lanza 404 si está en KNOWN")
    void getDoubtQuestionDetailValidatesDoubtOrFailedStatusAndBankAccess() {
        AppUser user = TestData.user(1L, "demo", UserRole.USER);
        Question q = sampleQuestion(10L);
        UserQuestionStatus uqs = new UserQuestionStatus(user, q, QuestionLearningStatus.DOUBT, 1);

        when(questionRepository.findById(10L)).thenReturn(Optional.of(q));
        when(statusRepository.findByUserUsernameAndQuestionId("demo", 10L)).thenReturn(Optional.of(uqs));
        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(false);
        when(accessControlService.allowedBankCodes("demo")).thenReturn(Set.of("MIR"));

        QuestionResponse detailDoubt = service.getDoubtQuestionDetail("demo", 10L);
        assertThat(detailDoubt.id()).isEqualTo(10L);
        assertThat(detailDoubt.learningStatus()).isEqualTo("DOUBT");

        // En estado FAILED también permite consultar el detalle
        uqs.setStatus(QuestionLearningStatus.FAILED);
        QuestionResponse detailFailed = service.getDoubtQuestionDetail("demo", 10L);
        assertThat(detailFailed.id()).isEqualTo(10L);
        assertThat(detailFailed.learningStatus()).isEqualTo("FAILED");

        // Si el usuario no tiene acceso al banco -> ForbiddenException
        when(accessControlService.allowedBankCodes("demo")).thenReturn(Set.of("BIR"));
        assertThatThrownBy(() -> service.getDoubtQuestionDetail("demo", 10L))
                .isInstanceOf(ForbiddenException.class);

        // Si la pregunta está en KNOWN para ese usuario -> NoSuchElementException
        uqs.setStatus(QuestionLearningStatus.KNOWN);
        when(accessControlService.allowedBankCodes("demo")).thenReturn(Set.of("MIR"));
        assertThatThrownBy(() -> service.getDoubtQuestionDetail("demo", 10L))
                .isInstanceOf(NoSuchElementException.class);
    }

    @Test
    @DisplayName("markAsDoubt sobreescribe manualmente una pregunta acertada (KNOWN) poniéndola en DOUBT con racha 0")
    void markAsDoubtOverridesKnownQuestionToDoubtWithZeroStreak() {
        AppUser user = TestData.user(1L, "demo", UserRole.USER);
        Question q = sampleQuestion(10L);

        // El usuario acaba de acertar la pregunta -> está en KNOWN con racha 1
        UserQuestionStatus initial = new UserQuestionStatus(user, q, QuestionLearningStatus.KNOWN, 1);
        when(questionRepository.findById(10L)).thenReturn(Optional.of(q));
        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(false);
        when(accessControlService.allowedBankCodes("demo")).thenReturn(Set.of("MIR"));
        when(statusRepository.findByUserUsernameAndQuestionId("demo", 10L)).thenReturn(Optional.of(initial));

        UserQuestionStatus overridden = service.markAsDoubt("demo", 10L);

        assertThat(overridden.getStatus()).isEqualTo(QuestionLearningStatus.DOUBT);
        assertThat(overridden.getConsecutiveCorrect()).isZero();
    }
}
