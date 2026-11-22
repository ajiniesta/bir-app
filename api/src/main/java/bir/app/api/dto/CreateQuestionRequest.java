package bir.app.api.dto;

import bir.app.api.support.QuestionTagSupport;
import io.micronaut.core.annotation.Creator;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

@Serdeable
public record CreateQuestionRequest(
    @NotBlank String text,
    String category,
    String tag,
    List<String> tags,
    String explanation,
    @NotNull Long examTypeId,
    @NotEmpty @Valid List<AnswerOptionRequest> answerOptions
) {
    @Creator
    public CreateQuestionRequest {
        List<String> resolved = QuestionTagSupport.parse(tag, tags);
        tags = resolved;
        tag = QuestionTagSupport.join(resolved);
    }

    public CreateQuestionRequest(
        String text,
        String category,
        String tag,
        String explanation,
        Long examTypeId,
        List<AnswerOptionRequest> answerOptions
    ) {
        this(text, category, tag, QuestionTagSupport.parse(tag), explanation, examTypeId, answerOptions);
    }

    public List<String> resolvedTags() {
        return QuestionTagSupport.parse(tag, tags);
    }

    @Serdeable
    public record AnswerOptionRequest(
        @NotBlank String letter,
        @NotBlank String text,
        @NotNull Boolean isCorrect
    ) {}
}
