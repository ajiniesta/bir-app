package bir.app.api.dto;

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
    String explanation,
    @NotNull Long examTypeId,
    @NotEmpty @Valid List<AnswerOptionRequest> answerOptions
) {
    @Serdeable
    public record AnswerOptionRequest(
        @NotBlank String letter,
        @NotBlank String text,
        @NotNull Boolean isCorrect
    ) {}
}
