package bir.app.api.dto;

import bir.app.api.entity.AnswerOption;
import bir.app.api.entity.Question;
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
    public static QuestionResponse from(Question q) {
        return new QuestionResponse(
            q.getId(),
            q.getText(),
            q.getCategory(),
            q.getExplanation(),
            q.getExamType().getCode(),
            q.getExamType().getName(),
            q.getAnswerOptions().stream().map(AnswerOptionResponse::from).toList(),
            q.getCreatedAt(),
            q.getUpdatedAt()
        );
    }

    @Serdeable
    public record AnswerOptionResponse(
        Long id,
        String letter,
        String text,
        Boolean isCorrect
    ) {
        public static AnswerOptionResponse from(AnswerOption o) {
            return new AnswerOptionResponse(o.getId(), o.getLetter(), o.getText(), o.getIsCorrect());
        }
    }
}
