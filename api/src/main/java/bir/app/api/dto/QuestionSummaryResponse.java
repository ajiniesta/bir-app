package bir.app.api.dto;

import bir.app.api.entity.Question;
import io.micronaut.serde.annotation.Serdeable;

/**
 * Resumen de una pregunta para el listado paginado. No incluye las opciones
 * de respuesta (ni cuál es la correcta) porque la vista de listado no las usa.
 */
@Serdeable
public record QuestionSummaryResponse(
    Long id,
    String text,
    String category,
    String examTypeCode
) {
    public static QuestionSummaryResponse from(Question q) {
        return new QuestionSummaryResponse(
            q.getId(),
            q.getText(),
            q.getCategory(),
            q.getExamType().getCode()
        );
    }
}
