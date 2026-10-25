package bir.app.api.service;

import bir.app.api.dto.CreateQuestionRequest;
import bir.app.api.dto.DashboardStatsResponse;
import bir.app.api.dto.QuestionPageResponse;
import bir.app.api.dto.QuestionResponse;
import bir.app.api.entity.ExamType;
import bir.app.api.entity.Question;
import bir.app.api.repository.ExamTypeRepository;
import bir.app.api.repository.MockExamRepository;
import bir.app.api.repository.QuestionRepository;
import bir.app.api.support.TestData;
import io.micronaut.data.model.Page;
import io.micronaut.data.model.Pageable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("QuestionService")
class QuestionServiceTest {

    @Mock
    QuestionRepository questionRepository;
    @Mock
    ExamTypeRepository examTypeRepository;
    @Mock
    MockExamRepository mockExamRepository;
    @Mock
    AccessControlService accessControlService;

    QuestionService service;

    @BeforeEach
    void setUp() {
        service = new QuestionService(questionRepository, examTypeRepository,
                mockExamRepository, accessControlService);
    }

    private static CreateQuestionRequest request(String tag, boolean... correct) {
        List<CreateQuestionRequest.AnswerOptionRequest> options = new ArrayList<>();
        String[] letters = {"A", "B", "C", "D"};
        for (int i = 0; i < correct.length; i++) {
            options.add(new CreateQuestionRequest.AnswerOptionRequest(
                    letters[i], "Texto " + letters[i], correct[i]));
        }
        return new CreateQuestionRequest("Enunciado", "Anatomía", tag, "  Explicación  ", 1L, options);
    }

    @Test
    @DisplayName("crea una pregunta con una única opción correcta y normaliza tag y explicación")
    void createWithOneCorrectOption() {
        ExamType examType = TestData.examType(1L, "MIR", "Médico Interno Residente");
        when(examTypeRepository.findById(1L)).thenReturn(Optional.of(examType));
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> {
            Question saved = invocation.getArgument(0);
            saved.setId(10L);
            return saved;
        });

        QuestionResponse response = service.create(request("  Tema 1  ", true, false));

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.tag()).isEqualTo("Tema 1");
        assertThat(response.explanation()).isEqualTo("Explicación");
        assertThat(response.examTypeCode()).isEqualTo("MIR");
        assertThat(response.answerOptions()).hasSize(2);
        assertThat(response.answerOptions()).filteredOn(o -> o.isCorrect()).hasSize(1);
    }

    @Test
    @DisplayName("rechaza una pregunta sin ninguna opción correcta")
    void createWithoutCorrectOption() {
        when(examTypeRepository.findById(1L))
                .thenReturn(Optional.of(TestData.examType(1L, "MIR", "MIR")));

        assertThatThrownBy(() -> service.create(request(null, false, false)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Exactly one answer must be correct");

        verify(questionRepository, never()).save(any(Question.class));
    }

    @Test
    @DisplayName("rechaza una pregunta con dos opciones correctas")
    void createWithTwoCorrectOptions() {
        when(examTypeRepository.findById(1L))
                .thenReturn(Optional.of(TestData.examType(1L, "MIR", "MIR")));

        assertThatThrownBy(() -> service.create(request(null, true, true)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("found 2");

        verify(questionRepository, never()).save(any(Question.class));
    }

    @Test
    @DisplayName("rechaza una pregunta de un tipo de examen inexistente")
    void createWithUnknownExamType() {
        when(examTypeRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(request(null, true, false)))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("Exam type not found");
    }

    @Test
    @DisplayName("actualiza la pregunta, reemplaza las opciones y hace flush antes de reinsertar")
    void updateReplacesOptionsAndFlushes() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        Question existing = TestData.question(7L, "Enunciado", examType,
                TestData.option("A", "Antigua A", true),
                TestData.option("B", "Antigua B", false));
        when(questionRepository.findById(7L)).thenReturn(Optional.of(existing));
        when(examTypeRepository.findById(1L)).thenReturn(Optional.of(examType));
        when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> invocation.getArgument(0));

        QuestionResponse response = service.update(7L, request("  Nueva etiqueta ", false, true));

        verify(questionRepository).flush();
        assertThat(existing.getAnswerOptions()).extracting("letter").containsExactly("A", "B");
        assertThat(existing.getAnswerOptions()).filteredOn(o -> Boolean.TRUE.equals(o.getIsCorrect()))
                .extracting("letter").containsExactly("B");
        assertThat(response.tag()).isEqualTo("Nueva etiqueta");
    }

    @Test
    @DisplayName("no borra una pregunta que pertenece a un simulacro")
    void deleteQuestionUsedInMockExam() {
        when(questionRepository.existsById(3L)).thenReturn(true);
        when(mockExamRepository.countByQuestionId(3L)).thenReturn(1L);

        assertThatThrownBy(() -> service.delete(3L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("simulacro");

        verify(questionRepository, never()).deleteById(3L);
    }

    @Test
    @DisplayName("lanza 404 al borrar una pregunta inexistente")
    void deleteMissingQuestion() {
        when(questionRepository.existsById(4L)).thenReturn(false);

        assertThatThrownBy(() -> service.delete(4L))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("Question not found");
    }

    @Test
    @DisplayName("borra una pregunta libre de simulacros")
    void deleteFreeQuestion() {
        when(questionRepository.existsById(5L)).thenReturn(true);
        when(mockExamRepository.countByQuestionId(5L)).thenReturn(0L);

        service.delete(5L);

        verify(questionRepository).deleteById(5L);
    }

    @Test
    @DisplayName("la búsqueda limita el tamaño a 100 y normaliza página y filtros")
    void searchClampsPageAndNormalizesFilters() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        Question question = TestData.question(1L, "Anatomía del corazón", examType,
                TestData.option("A", "Uno", true));
        when(questionRepository.search(anyString(), anyString(), anyString(), anyString(), any(Pageable.class)))
                .thenReturn(Page.of(List.of(question), Pageable.from(0, 100), 1L));

        QuestionPageResponse response = service.search(0, 500, "  Anatomía ", "MIR", "__NONE__", "Tema 1");

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(questionRepository).search(
                org.mockito.ArgumentMatchers.eq("MIR"),
                org.mockito.ArgumentMatchers.eq("__NONE__"),
                org.mockito.ArgumentMatchers.eq("Tema 1"),
                org.mockito.ArgumentMatchers.eq("%anatomia%"),
                pageable.capture());

        assertThat(pageable.getValue().getNumber()).isZero();
        assertThat(pageable.getValue().getSize()).isEqualTo(100);
        assertThat(response.page()).isEqualTo(1);
        assertThat(response.items()).hasSize(1);
    }

    @Test
    @DisplayName("si la página pedida no existe devuelve la última disponible")
    void searchFallsBackToLastPage() {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        Question question = TestData.question(1L, "Pregunta", examType,
                TestData.option("A", "Uno", true));
        Page<Question> first = Page.of(List.of(question), Pageable.from(0, 20), 25L);
        Page<Question> last = Page.of(List.of(question), Pageable.from(1, 20), 25L);
        when(questionRepository.search(anyString(), anyString(), anyString(), anyString(), any(Pageable.class)))
                .thenReturn(first, last);

        QuestionPageResponse response = service.search(5, 20, null, null, null, null);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(questionRepository, org.mockito.Mockito.times(2))
                .search(anyString(), anyString(), anyString(), anyString(), pageable.capture());
        assertThat(pageable.getAllValues()).extracting(Pageable::getNumber).containsExactly(4, 1);
        assertThat(response.page()).isEqualTo(2);
    }

    @Test
    @DisplayName("las estadísticas de un USER solo incluyen sus bancos asignados")
    void dashboardStatsForUserFiltersBanks() {
        DashboardStatsResponse.ExamTypeStats mir = new DashboardStatsResponse.ExamTypeStats("MIR", "MIR", 10);
        DashboardStatsResponse.ExamTypeStats eir = new DashboardStatsResponse.ExamTypeStats("EIR", "EIR", 5);
        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(false);
        when(accessControlService.allowedBankCodes("demo")).thenReturn(Set.of("MIR"));
        when(examTypeRepository.countQuestionsByExamType()).thenReturn(List.of(mir, eir));

        DashboardStatsResponse response = service.dashboardStatsFor("demo");

        assertThat(response.totalQuestions()).isEqualTo(10);
        assertThat(response.byExamType()).containsExactly(mir);
    }

    @Test
    @DisplayName("ADMIN y CREATOR ven las estadísticas de todos los bancos")
    void dashboardStatsForGlobalUser() {
        DashboardStatsResponse.ExamTypeStats mir = new DashboardStatsResponse.ExamTypeStats("MIR", "MIR", 10);
        DashboardStatsResponse.ExamTypeStats eir = new DashboardStatsResponse.ExamTypeStats("EIR", "EIR", 5);
        when(accessControlService.hasGlobalBankAccess("admin")).thenReturn(true);
        when(examTypeRepository.countQuestionsByExamType()).thenReturn(List.of(mir, eir));

        DashboardStatsResponse response = service.dashboardStatsFor("admin");

        assertThat(response.totalQuestions()).isEqualTo(15);
        assertThat(response.byExamType()).hasSize(2);
    }
}
