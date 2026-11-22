package bir.app.api.dto;

import bir.app.api.support.QuestionTagSupport;
import io.micronaut.core.annotation.Creator;
import io.micronaut.serde.annotation.Serdeable;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Estado completo de un intento de simulacro.
 * <p>
 * Mientras el intento no está entregado no se revela ninguna respuesta
 * correcta: {@code correctLetter} e {@code correct} de cada item van a
 * {@code null}. Al entregar se exponen ambos.
 */
@Serdeable
public record MockExamAttemptResponse(
    Long id,
    Long mockExamId,
    String mockExamTitle,
    String examTypeCode,
    String examTypeName,
    boolean finished,
    LocalDateTime startedAt,
    LocalDateTime finishedAt,
    int totalQuestions,
    int answeredCount,
    int correctCount,
    double accuracy,
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
