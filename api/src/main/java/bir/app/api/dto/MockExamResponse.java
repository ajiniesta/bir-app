package bir.app.api.dto;

import bir.app.api.support.QuestionTagSupport;
import io.micronaut.core.annotation.Creator;
import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Detalle de un simulacro. Nunca expone cuál es la opción correcta: solo el
 * enunciado de cada pregunta y sus opciones.
 */
@Serdeable
public record MockExamResponse(
    Long id,
    String title,
    String description,
    String examTypeCode,
    String examTypeName,
    int questionCount,
    List<QuestionSummary> questions
) {
    @Serdeable
    public record QuestionSummary(
        int position,
        Long questionId,
        String text,
        String category,
        String tag,
        List<String> tags,
        String explanation,
        List<OptionSummary> options
    ) {
        @Creator
        public QuestionSummary {
            if (options == null) {
                options = List.of();
            }
            tags = tags != null ? List.copyOf(tags) : QuestionTagSupport.parse(tag);
        }

        public QuestionSummary(
            int position,
            Long questionId,
            String text,
            String category,
            String tag,
            String explanation,
            List<OptionSummary> options
        ) {
            this(position, questionId, text, category, tag, QuestionTagSupport.parse(tag), explanation, options);
        }
    }

    /** Opción de respuesta: solo letra y texto, nunca si es la correcta. */
    @Serdeable
    public record OptionSummary(
        String letter,
        String text
    ) {}
}
