package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Datos del formulario HTML de alta/edición de un simulacro.
 * {@code questionIds} llega de los checkboxes (campo repetido).
 */
@Serdeable
public record MockExamForm(
    String title,
    String description,
    Long examTypeId,
    List<Long> questionIds
) {
    public MockExamForm {
        if (questionIds == null) {
            questionIds = List.of();
        }
    }

    public CreateMockExamRequest toApiRequest() {
        return new CreateMockExamRequest(title, description, examTypeId, questionIds);
    }
}
