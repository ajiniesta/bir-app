package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Datos tal y como llegan del formulario HTML.
 * <p>
 * La opción correcta viaja en un único campo ({@code correctLetter}) en lugar de
 * repetir el nombre de campo de cada opción: el binder de Micronaut rechaza que un
 * mismo campo aparezca varias veces ("Expected one string, but got array of multiple
 * values"), y con radios es inevitable si se usa el truco de hidden + radio.
 */
@Serdeable
public record QuestionFormSubmission(
    String text,
    String category,
    Long examTypeId,
    String correctLetter,
    List<AnswerOption> answerOptions
) {
    @Serdeable
    public record AnswerOption(String letter, String text) {}

    /** Convierte el formulario a la petición que espera la API. */
    public CreateQuestionRequest toApiRequest() {
        List<CreateQuestionRequest.AnswerOptionRequest> options = answerOptions == null ? List.of()
                : answerOptions.stream()
                    .filter(o -> o.letter() != null)
                    .map(o -> new CreateQuestionRequest.AnswerOptionRequest(
                            o.letter(),
                            o.text(),
                            o.letter().equalsIgnoreCase(correctLetter)))
                    .toList();
        return new CreateQuestionRequest(text, category, examTypeId, options);
    }
}
