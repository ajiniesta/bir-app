package bir.app.api.dto;

import bir.app.api.entity.Question;
import bir.app.api.support.QuestionTagSupport;
import io.micronaut.core.annotation.Creator;
import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Resumen de una pregunta para el listado paginado. No incluye las opciones
 * de respuesta (ni cuál es la correcta) porque la vista de listado no las usa.
 */
@Serdeable
public record QuestionSummaryResponse(
    Long id,
    String text,
    String category,
    String tag,
    List<String> tags,
    String examTypeCode
) {
    @Creator
    public QuestionSummaryResponse {
        tags = tags != null ? List.copyOf(tags) : QuestionTagSupport.parse(tag);
    }

    public QuestionSummaryResponse(
        Long id,
        String text,
        String category,
        String tag,
        String examTypeCode
    ) {
        this(id, text, category, tag, QuestionTagSupport.parse(tag), examTypeCode);
    }

    public static QuestionSummaryResponse from(Question q) {
        List<String> parsedTags = q.getTags();
        return new QuestionSummaryResponse(
            q.getId(),
            q.getText(),
            q.getCategory(),
            QuestionTagSupport.join(parsedTags),
            parsedTags,
            q.getExamType().getCode()
        );
    }
}
