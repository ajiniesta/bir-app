package bir.app.api.service;

import bir.app.api.dto.CreateMockExamRequest;
import bir.app.api.dto.MockExamResponse;
import bir.app.api.dto.MockExamSummaryResponse;
import bir.app.api.entity.AppUser;
import bir.app.api.entity.ExamType;
import bir.app.api.entity.MockExam;
import bir.app.api.entity.Question;
import bir.app.api.entity.UserRole;
import bir.app.api.exception.ForbiddenException;
import bir.app.api.repository.ExamTypeRepository;
import bir.app.api.repository.MockExamAttemptRepository;
import bir.app.api.repository.MockExamRepository;
import bir.app.api.repository.QuestionRepository;
import bir.app.api.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;
import java.util.stream.LongStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("MockExamService")
class MockExamServiceTest {

    @Mock
    MockExamRepository mockExamRepository;
    @Mock
    MockExamAttemptRepository attemptRepository;
    @Mock
    QuestionRepository questionRepository;
    @Mock
    ExamTypeRepository examTypeRepository;
    @Mock
    AppUserService appUserService;
    @Mock
    AccessControlService accessControlService;

    MockExamService service;

    @BeforeEach
    void setUp() {
        service = new MockExamService(mockExamRepository, attemptRepository, questionRepository,
                examTypeRepository, appUserService, accessControlService);
    }

    private static List<Question> questions(int count, ExamType examType) {
        List<Question> list = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            list.add(TestData.question((long) i, "Pregunta " + i, examType,
                    TestData.option("A", "Opción " + i, true)));
        }
        return list;
    }

    private static List<Long> ids(int count) {
        return LongStream.rangeClosed(1, count).boxed().toList();
    }

    private static CreateMockExamRequest request(List<Long> ids) {
        return new CreateMockExamRequest("Simulacro", "Descripción", 1L, ids);
    }

    private void stubCreate(List<Long> ids, List<Question> questions) {
        when(appUserService.requireByUsername("admin"))
                .thenReturn(TestData.user(1L, "admin", UserRole.ADMIN));
        when(examTypeRepository.findById(1L))
                .thenReturn(Optional.of(TestData.examType(1L, "MIR", "MIR")));
        when(questionRepository.findByIdIn(anyCollection())).thenReturn(questions);
        when(mockExamRepository.save(any(MockExam.class))).thenAnswer(invocation -> {
            MockExam exam = invocation.getArgument(0);
            exam.setId(99L);
            return exam;
        });
    }

    @Test
    @DisplayName("acepta un simulacro con 210 preguntas (regresión del límite del formulario)")
    void createAcceptsUpTo210Questions() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        List<Long> ids = ids(210);
        List<Question> questions = questions(210, examType);
        stubCreate(ids, questions);

        MockExamResponse response = service.create("admin", request(ids));

        assertThat(response.id()).isEqualTo(99L);
        assertThat(response.questionCount()).isEqualTo(210);
        assertThat(response.questions()).hasSize(210);
        assertThat(response.questions().get(0).position()).isEqualTo(1);
        assertThat(response.questions().get(0).questionId()).isEqualTo(1L);
        assertThat(response.questions().get(209).position()).isEqualTo(210);
        assertThat(response.questions().get(209).questionId()).isEqualTo(210L);
        verify(mockExamRepository).save(any(MockExam.class));
    }

    @Test
    @DisplayName("rechaza un simulacro con más de 210 preguntas")
    void createRejectsMoreThan210Questions() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        List<Long> ids = ids(211);
        when(appUserService.requireByUsername("admin"))
                .thenReturn(TestData.user(1L, "admin", UserRole.ADMIN));
        when(examTypeRepository.findById(1L)).thenReturn(Optional.of(examType));

        assertThatThrownBy(() -> service.create("admin", request(ids)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("más de 210 preguntas");
        verify(mockExamRepository, never()).save(any(MockExam.class));
    }

    @Test
    @DisplayName("rechaza preguntas repetidas")
    void createRejectsDuplicateQuestions() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        when(appUserService.requireByUsername("admin"))
                .thenReturn(TestData.user(1L, "admin", UserRole.ADMIN));
        when(examTypeRepository.findById(1L)).thenReturn(Optional.of(examType));

        assertThatThrownBy(() -> service.create("admin", request(List.of(1L, 2L, 1L))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("repetidas");
        verify(questionRepository, never()).findByIdIn(anyCollection());
    }

    @Test
    @DisplayName("rechaza una pregunta que no existe")
    void createRejectsUnknownQuestion() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        Question onlyOne = TestData.question(1L, "Pregunta 1", examType, TestData.option("A", "A", true));
        when(appUserService.requireByUsername("admin"))
                .thenReturn(TestData.user(1L, "admin", UserRole.ADMIN));
        when(examTypeRepository.findById(1L)).thenReturn(Optional.of(examType));
        when(questionRepository.findByIdIn(anyCollection())).thenReturn(List.of(onlyOne));

        assertThatThrownBy(() -> service.create("admin", request(List.of(1L, 2L))))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("Pregunta no encontrada");
    }

    @Test
    @DisplayName("rechaza una pregunta de otro banco")
    void createRejectsQuestionFromAnotherBank() {
        ExamType mir = TestData.examType(1L, "MIR", "MIR");
        ExamType eir = TestData.examType(2L, "EIR", "EIR");
        Question foreign = TestData.question(1L, "Pregunta EIR", eir, TestData.option("A", "A", true));
        when(appUserService.requireByUsername("admin"))
                .thenReturn(TestData.user(1L, "admin", UserRole.ADMIN));
        when(examTypeRepository.findById(1L)).thenReturn(Optional.of(mir));
        when(questionRepository.findByIdIn(anyCollection())).thenReturn(List.of(foreign));

        assertThatThrownBy(() -> service.create("admin", request(List.of(1L))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("pertenece al banco EIR");
    }

    @Test
    @DisplayName("actualiza un simulacro respetando el orden de las preguntas y hace flush")
    void updateReordersQuestionsAndFlushes() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        MockExam existing = TestData.mockExam(50L, "Antiguo", examType,
                TestData.question(9L, "Antigua", examType, TestData.option("A", "A", true)));
        Question first = TestData.question(1L, "Primera", examType, TestData.option("A", "A", true));
        Question second = TestData.question(2L, "Segunda", examType, TestData.option("A", "A", true));
        when(mockExamRepository.findDetailedById(50L)).thenReturn(Optional.of(existing));
        when(examTypeRepository.findById(1L)).thenReturn(Optional.of(examType));
        // La base de datos puede devolver las preguntas en cualquier orden.
        when(questionRepository.findByIdIn(anyCollection())).thenReturn(List.of(second, first));
        when(mockExamRepository.save(any(MockExam.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MockExamResponse response = service.update(50L, request(List.of(1L, 2L)));

        verify(mockExamRepository).flush();
        assertThat(existing.getQuestions()).extracting("position").containsExactly(1, 2);
        assertThat(existing.getQuestions()).extracting(q -> q.getQuestion().getId()).containsExactly(1L, 2L);
        assertThat(response.title()).isEqualTo("Simulacro");
        assertThat(response.questionCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("lanza 404 al actualizar un simulacro inexistente")
    void updateMissingMockExam() {
        when(mockExamRepository.findDetailedById(77L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(77L, request(List.of(1L))))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("Simulacro no encontrado");
    }

    @Test
    @DisplayName("lanza 404 al borrar un simulacro inexistente")
    void deleteMissingMockExam() {
        when(mockExamRepository.existsById(8L)).thenReturn(false);

        assertThatThrownBy(() -> service.delete(8L))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("Simulacro no encontrado");
    }

    @Test
    @DisplayName("borra un simulacro existente")
    void deleteExistingMockExam() {
        when(mockExamRepository.existsById(8L)).thenReturn(true);

        service.delete(8L);

        verify(mockExamRepository).deleteById(8L);
    }

    @Test
    @DisplayName("un USER sin bancos asignados no ve ningún simulacro")
    void listForUserWithoutBanks() {
        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(false);
        when(accessControlService.allowedBankCodes("demo")).thenReturn(Set.of());

        List<MockExamSummaryResponse> result = service.listFor("demo");

        assertThat(result).isEmpty();
        verify(mockExamRepository, never()).findAllWithQuestions();
        verify(attemptRepository, never()).findByUsername("demo");
    }

    @Test
    @DisplayName("un USER ve solo los simulacros de sus bancos")
    void listForUserWithBanks() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        MockExam exam = TestData.mockExam(5L, "Simulacro MIR", examType,
                TestData.question(1L, "Pregunta", examType, TestData.option("A", "A", true)));
        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(false);
        when(accessControlService.allowedBankCodes("demo")).thenReturn(Set.of("MIR"));
        when(mockExamRepository.findByExamTypeCodeInWithQuestions(Set.of("MIR"))).thenReturn(List.of(exam));
        when(attemptRepository.findByUsername("demo")).thenReturn(List.of());

        List<MockExamSummaryResponse> result = service.listFor("demo");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).examTypeCode()).isEqualTo("MIR");
        assertThat(result.get(0).questionCount()).isEqualTo(1);
        assertThat(result.get(0).attemptCount()).isZero();
        assertThat(result.get(0).bestAccuracy()).isNull();
    }

    @Test
    @DisplayName("ADMIN ve todos los simulacros")
    void listForAdmin() {
        when(accessControlService.hasGlobalBankAccess("admin")).thenReturn(true);
        when(mockExamRepository.findAllWithQuestions()).thenReturn(List.of());

        assertThat(service.listFor("admin")).isEmpty();

        verify(mockExamRepository).findAllWithQuestions();
    }

    @Test
    @DisplayName("obtiene el detalle sin revelar la opción correcta")
    void getDetailedMockExam() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        Question question = TestData.question(1L, "Pregunta", examType,
                TestData.option("A", "Uno", true), TestData.option("B", "Dos", false));
        MockExam exam = TestData.mockExam(5L, "Simulacro", examType, question);
        when(mockExamRepository.findDetailedById(5L)).thenReturn(Optional.of(exam));
        when(questionRepository.findByIdIn(anyCollection())).thenReturn(List.of(question));

        MockExamResponse response = service.get("demo", 5L);

        assertThat(response.questionCount()).isEqualTo(1);
        assertThat(response.questions().get(0).options())
                .extracting(MockExamResponse.OptionSummary::letter)
                .containsExactly("A", "B");
    }

    @Test
    @DisplayName("propaga el 403 si el usuario no tiene acceso al banco")
    void getWithoutBankAccess() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        MockExam exam = TestData.mockExam(5L, "Simulacro", examType);
        when(mockExamRepository.findDetailedById(5L)).thenReturn(Optional.of(exam));
        doThrow(new ForbiddenException("sin acceso"))
                .when(accessControlService).requireBankAccess("demo", examType);

        assertThatThrownBy(() -> service.get("demo", 5L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("sin acceso");
    }
}
