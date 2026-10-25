package bir.app.web.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("QuestionForm")
class QuestionFormTest {

    @Test
    @DisplayName("el formulario vacío lleva las cuatro opciones A-D sin marcar")
    void emptyFormHasFourEmptySlots() {
        QuestionForm form = QuestionForm.empty();

        assertThat(form.id()).isNull();
        assertThat(form.editing()).isFalse();
        assertThat(form.text()).isEmpty();
        assertThat(form.category()).isEmpty();
        assertThat(form.tag()).isEmpty();
        assertThat(form.explanation()).isEmpty();
        assertThat(form.examTypeCode()).isNull();
        assertThat(form.slots()).extracting(AnswerOptionSlot::letter)
                .containsExactly("A", "B", "C", "D");
        assertThat(form.slots()).allSatisfy(slot -> {
            assertThat(slot.text()).isEmpty();
            assertThat(slot.correct()).isFalse();
        });
    }

    @Test
    @DisplayName("rellena el formulario de edición y marca la opción correcta")
    void formFromQuestion() {
        QuestionResponse question = new QuestionResponse(
                7L, "¿Pregunta?", "Anatomía", "Tema 1", "Explicación", "MIR", "MIR",
                List.of(new QuestionResponse.AnswerOptionResponse(1L, "A", "Opción A", true),
                        new QuestionResponse.AnswerOptionResponse(3L, "C", "Opción C", false)),
                null, null);

        QuestionForm form = QuestionForm.of(question);

        assertThat(form.id()).isEqualTo(7L);
        assertThat(form.editing()).isTrue();
        assertThat(form.text()).isEqualTo("¿Pregunta?");
        assertThat(form.tag()).isEqualTo("Tema 1");
        assertThat(form.examTypeCode()).isEqualTo("MIR");
        assertThat(form.slots()).extracting(AnswerOptionSlot::letter)
                .containsExactly("A", "B", "C", "D");
        assertThat(form.slots().get(0).text()).isEqualTo("Opción A");
        assertThat(form.slots().get(0).correct()).isTrue();
        assertThat(form.slots().get(1).text()).isEmpty();
        assertThat(form.slots().get(1).correct()).isFalse();
        assertThat(form.slots().get(2).text()).isEqualTo("Opción C");
        assertThat(form.slots().get(3).text()).isEmpty();
    }

    @Test
    @DisplayName("repuebla el formulario tras un error conservando los datos enviados")
    void formFromSubmissionAfterError() {
        QuestionFormSubmission submission = new QuestionFormSubmission(
                "Enunciado", "Anatomía", "Tema 1", "Explicación", 2L, "b",
                List.of(new QuestionFormSubmission.AnswerOption("A", "Opción A"),
                        new QuestionFormSubmission.AnswerOption("B", "Opción B"),
                        new QuestionFormSubmission.AnswerOption("C", "Opción C")));
        List<ExamTypeResponse> examTypes = List.of(
                new ExamTypeResponse(1L, "MIR", "MIR"),
                new ExamTypeResponse(2L, "BIR", "BIR"));

        QuestionForm form = QuestionForm.of(submission, null, examTypes);

        assertThat(form.id()).isNull();
        assertThat(form.editing()).isFalse();
        assertThat(form.text()).isEqualTo("Enunciado");
        assertThat(form.category()).isEqualTo("Anatomía");
        assertThat(form.tag()).isEqualTo("Tema 1");
        assertThat(form.explanation()).isEqualTo("Explicación");
        assertThat(form.examTypeCode()).isEqualTo("BIR");
        assertThat(form.slots()).extracting(AnswerOptionSlot::correct)
                .containsExactly(false, true, false, false);
        assertThat(form.slots().get(0).text()).isEqualTo("Opción A");
        assertThat(form.slots().get(3).text()).isEmpty();
    }

    @Test
    @DisplayName("al editar tras un error conserva el id y marca editing")
    void formFromSubmissionWhileEditing() {
        QuestionFormSubmission submission = new QuestionFormSubmission(
                "Enunciado", null, null, null, 99L, "A",
                List.of(new QuestionFormSubmission.AnswerOption("A", "Opción A")));

        QuestionForm form = QuestionForm.of(submission, 5L, List.of());

        assertThat(form.id()).isEqualTo(5L);
        assertThat(form.editing()).isTrue();
        assertThat(form.category()).isEmpty();
        assertThat(form.tag()).isEmpty();
        assertThat(form.explanation()).isEmpty();
        assertThat(form.examTypeCode()).isNull();
        assertThat(form.slots().get(0).correct()).isTrue();
    }

    @Test
    @DisplayName("la sumisión construye la petición con una sola opción correcta")
    void submissionToApiRequest() {
        QuestionFormSubmission submission = new QuestionFormSubmission(
                "Enunciado", "Anatomía", "Tema 1", "Explicación", 1L, "B",
                List.of(new QuestionFormSubmission.AnswerOption("A", "Opción A"),
                        new QuestionFormSubmission.AnswerOption("B", "Opción B")));

        CreateQuestionRequest request = submission.toApiRequest();

        assertThat(request.text()).isEqualTo("Enunciado");
        assertThat(request.tag()).isEqualTo("Tema 1");
        assertThat(request.examTypeId()).isEqualTo(1L);
        assertThat(request.answerOptions()).hasSize(2);
        assertThat(request.answerOptions()).filteredOn(CreateQuestionRequest.AnswerOptionRequest::isCorrect)
                .extracting(CreateQuestionRequest.AnswerOptionRequest::letter)
                .containsExactly("B");
    }

    @Test
    @DisplayName("una sumisión sin opciones genera una lista vacía")
    void submissionWithoutOptions() {
        QuestionFormSubmission submission = new QuestionFormSubmission(
                "Enunciado", null, null, null, 1L, "A", null);

        assertThat(submission.toApiRequest().answerOptions()).isEmpty();
    }
}
