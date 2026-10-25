package bir.app.api.service;

import bir.app.api.dto.CreateQuestionRequest;
import bir.app.api.dto.QuestionImportResponse;
import bir.app.api.entity.ExamType;
import bir.app.api.repository.ExamTypeRepository;
import bir.app.api.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("QuestionImportService")
class QuestionImportServiceTest {

    @Mock
    QuestionService questionService;
    @Mock
    ExamTypeRepository examTypeRepository;

    QuestionImportService service;

    @BeforeEach
    void setUp() {
        service = new QuestionImportService(questionService, examTypeRepository);
    }

    private static String question(String examType, String text) {
        return """
                {"exam_type":"%s","text":"%s","category":"Anatomía","tag":" Tema 1 ",
                 "answers":[{"letter":"b","text":"Opción B","is_correct":true},
                            {"letter":"a","text":"Opción A","is_correct":false}]}
                """.formatted(examType, text);
    }

    @Test
    @DisplayName("importa un único objeto y normaliza letras, tag y espacios")
    void importsSingleObject() {
        when(examTypeRepository.findByCode("BIR"))
                .thenReturn(Optional.of(TestData.examType(2L, "BIR", "BIR")));

        QuestionImportResponse response = service.importQuestions(question("BIR", " ¿Qué es? "));

        assertThat(response.total()).isEqualTo(1);
        assertThat(response.imported()).isEqualTo(1);
        assertThat(response.skipped()).isZero();
        assertThat(response.errors()).isEmpty();

        ArgumentCaptor<CreateQuestionRequest> request = ArgumentCaptor.forClass(CreateQuestionRequest.class);
        verify(questionService).create(request.capture());
        assertThat(request.getValue().text()).isEqualTo("¿Qué es?");
        assertThat(request.getValue().tag()).isEqualTo("Tema 1");
        assertThat(request.getValue().examTypeId()).isEqualTo(2L);
        assertThat(request.getValue().answerOptions())
                .extracting(CreateQuestionRequest.AnswerOptionRequest::letter)
                .containsExactly("A", "B");
        assertThat(request.getValue().answerOptions())
                .filteredOn(CreateQuestionRequest.AnswerOptionRequest::isCorrect)
                .extracting(CreateQuestionRequest.AnswerOptionRequest::letter)
                .containsExactly("B");
    }

    @Test
    @DisplayName("importa objetos concatenados y salta el que tiene JSON inválido")
    void importsConcatenatedObjectsAndSkipsBrokenOne() {
        when(examTypeRepository.findByCode("BIR"))
                .thenReturn(Optional.of(TestData.examType(2L, "BIR", "BIR")));
        String content = question("BIR", "Primera")
                + "{\"exam_type\": BIR, \"text\": \"Rota\"}"
                + question("BIR", "Segunda");

        QuestionImportResponse response = service.importQuestions(content);

        assertThat(response.total()).isEqualTo(3);
        assertThat(response.imported()).isEqualTo(2);
        assertThat(response.skipped()).isEqualTo(1);
        assertThat(response.errors()).hasSize(1);
        assertThat(response.errors().get(0)).contains("Pregunta 2: JSON inválido");
    }

    @Test
    @DisplayName("acepta un array con BOM y comas finales")
    void importsArrayWithBomAndTrailingCommas() {
        when(examTypeRepository.findByCode("BIR"))
                .thenReturn(Optional.of(TestData.examType(2L, "BIR", "BIR")));
        String content = "\uFEFF[\n"
                + "{\"exam_type\":\"BIR\",\"text\":\"Uno\",\"answers\":["
                + "{\"letter\":\"A\",\"text\":\"A\",\"is_correct\":true,},],},\n"
                + "{\"exam_type\":\"BIR\",\"text\":\"Dos\",\"answers\":["
                + "{\"letter\":\"A\",\"text\":\"A\",\"is_correct\":true,},],},\n"
                + "]";

        QuestionImportResponse response = service.importQuestions(content);

        assertThat(response.total()).isEqualTo(2);
        assertThat(response.imported()).isEqualTo(2);
        assertThat(response.skipped()).isZero();
    }

    @Test
    @DisplayName("interpreta un exam_type numérico como id")
    void resolvesNumericExamTypeAsId() {
        when(examTypeRepository.findById(3L))
                .thenReturn(Optional.of(TestData.examType(3L, "FIR", "FIR")));

        QuestionImportResponse response = service.importQuestions(question("3", "Pregunta"));

        assertThat(response.imported()).isEqualTo(1);
        ArgumentCaptor<CreateQuestionRequest> request = ArgumentCaptor.forClass(CreateQuestionRequest.class);
        verify(questionService).create(request.capture());
        assertThat(request.getValue().examTypeId()).isEqualTo(3L);
    }

    @Test
    @DisplayName("descarta una pregunta con letras repetidas")
    void rejectsDuplicateLetters() {
        when(examTypeRepository.findByCode("BIR"))
                .thenReturn(Optional.of(TestData.examType(2L, "BIR", "BIR")));
        String content = """
                {"exam_type":"BIR","text":"Pregunta","answers":[
                  {"letter":"A","text":"Una","is_correct":true},
                  {"letter":"a","text":"Otra","is_correct":false}]}
                """;

        QuestionImportResponse response = service.importQuestions(content);

        assertThat(response.imported()).isZero();
        assertThat(response.skipped()).isEqualTo(1);
        assertThat(response.errors()).anySatisfy(error -> assertThat(error).contains("letra repetida 'A'"));
    }

    @Test
    @DisplayName("descarta una pregunta con dos respuestas correctas")
    void rejectsMoreThanOneCorrectAnswer() {
        when(examTypeRepository.findByCode("BIR"))
                .thenReturn(Optional.of(TestData.examType(2L, "BIR", "BIR")));
        String content = """
                {"exam_type":"BIR","text":"Pregunta","answers":[
                  {"letter":"A","text":"Una","is_correct":true},
                  {"letter":"B","text":"Otra","is_correct":true}]}
                """;

        QuestionImportResponse response = service.importQuestions(content);

        assertThat(response.imported()).isZero();
        assertThat(response.errors()).anySatisfy(error ->
                assertThat(error).contains("exactamente una respuesta correcta (hay 2)"));
        verify(questionService, org.mockito.Mockito.never()).create(any());
    }

    @Test
    @DisplayName("descarta un tag de más de 100 caracteres")
    void rejectsTooLongTag() {
        when(examTypeRepository.findByCode("BIR"))
                .thenReturn(Optional.of(TestData.examType(2L, "BIR", "BIR")));
        String longTag = "x".repeat(101);
        String content = """
                {"exam_type":"BIR","text":"Pregunta","tag":"%s","answers":[
                  {"letter":"A","text":"Una","is_correct":true}]}
                """.formatted(longTag);

        QuestionImportResponse response = service.importQuestions(content);

        assertThat(response.imported()).isZero();
        assertThat(response.errors()).anySatisfy(error ->
                assertThat(error).contains("el tag no puede superar 100 caracteres"));
    }

    @Test
    @DisplayName("descarta una pregunta sin enunciado")
    void rejectsQuestionWithoutText() {
        String content = """
                {"exam_type":"BIR","answers":[{"letter":"A","text":"Una","is_correct":true}]}
                """;

        QuestionImportResponse response = service.importQuestions(content);

        assertThat(response.imported()).isZero();
        assertThat(response.errors()).anySatisfy(error ->
                assertThat(error).contains("el campo 'text' es obligatorio"));
    }

    @Test
    @DisplayName("informa de un tipo de examen inexistente")
    void rejectsUnknownExamType() {
        when(examTypeRepository.findByCode("XXX")).thenReturn(Optional.empty());

        QuestionImportResponse response = service.importQuestions(question("XXX", "Pregunta"));

        assertThat(response.imported()).isZero();
        assertThat(response.errors()).anySatisfy(error ->
                assertThat(error).contains("tipo de examen no encontrado: XXX"));
    }

    @Test
    @DisplayName("devuelve un error si el fichero está vacío")
    void reportsEmptyFile() {
        QuestionImportResponse response = service.importQuestions("   ");

        assertThat(response.total()).isZero();
        assertThat(response.errors()).containsExactly("El fichero está vacío.");
    }

    @Test
    @DisplayName("devuelve un error si no se encuentra ningún objeto JSON")
    void reportsContentWithoutObjects() {
        QuestionImportResponse response = service.importQuestions("esto no es json");

        assertThat(response.total()).isZero();
        assertThat(response.errors()).hasSize(1);
        assertThat(response.errors().get(0)).contains("No se ha encontrado ninguna pregunta");
    }

    @Test
    @DisplayName("reporta el fallo al guardar una pregunta válida")
    void reportsSaveFailure() {
        when(examTypeRepository.findByCode("BIR"))
                .thenReturn(Optional.of(TestData.examType(2L, "BIR", "BIR")));
        when(questionService.create(any())).thenThrow(new IllegalStateException("boom"));

        QuestionImportResponse response = service.importQuestions(question("BIR", "Pregunta"));

        assertThat(response.imported()).isZero();
        assertThat(response.skipped()).isEqualTo(1);
        assertThat(response.errors()).anySatisfy(error ->
                assertThat(error).contains("no se pudo guardar (boom)"));
    }
}
