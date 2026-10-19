package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;
import java.time.LocalDateTime;
import java.util.List;

@Serdeable
public record QuestionResponse(
    Long id,
    String text,
    String category,
    String explanation,
    String examTypeCode,
    String examTypeName,
    List<AnswerOptionResponse> answerOptions,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    @Serdeable
    public record AnswerOptionResponse(
        Long id,
        String letter,
        String text,
        Boolean isCorrect
    ) {}
}
