package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;
import java.util.List;

@Serdeable
public record CreateQuestionRequest(
    String text,
    String category,
    String tag,
    String explanation,
    Long examTypeId,
    List<AnswerOptionRequest> answerOptions
) {
    @Serdeable
    public record AnswerOptionRequest(
        String letter,
        String text,
        Boolean isCorrect
    ) {}
}
