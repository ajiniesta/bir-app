package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.time.LocalDateTime;
import java.util.List;

/** Espejo de {@code bir.app.api.dto.MockExamAttemptResponse}. */
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
    public MockExamAttemptResponse {
        if (items == null) {
            items = List.of();
        }
    }

    @Serdeable
    public record Item(
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
        public Item {
            if (options == null) {
                options = List.of();
            }
        }
    }

    @Serdeable
    public record Option(String letter, String text) {}
}
