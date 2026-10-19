package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/** Espejo de {@code bir.app.api.dto.MockExamResponse}. */
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
    public MockExamResponse {
        if (questions == null) {
            questions = List.of();
        }
    }

    @Serdeable
    public record QuestionSummary(
        int position,
        Long questionId,
        String text,
        String category,
        List<OptionSummary> options
    ) {
        public QuestionSummary {
            if (options == null) {
                options = List.of();
            }
        }
    }

    @Serdeable
    public record OptionSummary(
        String letter,
        String text
    ) {}
}
