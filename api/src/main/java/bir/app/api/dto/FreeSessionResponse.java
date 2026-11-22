package bir.app.api.dto;

import bir.app.api.support.QuestionTagSupport;
import io.micronaut.core.annotation.Creator;
import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Estado completo de una partida del modo libre.
 * <p>
 * Por seguridad, las opciones de las preguntas <b>no respondidas</b> no incluyen
 * cuál es la correcta; solo se revela ({@code correctLetter}) una vez respondida.
 */
@Serdeable
public record FreeSessionResponse(
    Long id,
    String examTypeCode,
    String examTypeName,
    String category,
    String tag,
    int totalQuestions,
    int answeredCount,
    int correctCount,
    boolean finished,
    List<Item> items
) {
    @Serdeable
    public record Item(
        int position,
        Long questionId,
        String questionText,
        String category,
        String tag,
        List<String> tags,
        String explanation,
        List<Option> options,
        boolean answered,
        String selectedLetter,
        Boolean correct,
        String correctLetter
    ) {
        @Creator
        public Item {
            tags = tags != null ? List.copyOf(tags) : QuestionTagSupport.parse(tag);
        }

        public Item(
            int position,
            Long questionId,
            String questionText,
            String category,
            String tag,
            String explanation,
            List<Option> options,
            boolean answered,
            String selectedLetter,
            Boolean correct,
            String correctLetter
        ) {
            this(position, questionId, questionText, category, tag, QuestionTagSupport.parse(tag),
                    explanation, options, answered, selectedLetter, correct, correctLetter);
        }
    }

    @Serdeable
    public record Option(String letter, String text) {}
}
