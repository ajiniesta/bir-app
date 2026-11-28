package bir.app.api.dto;

import bir.app.api.entity.AnswerOption;
import bir.app.api.entity.Question;
import bir.app.api.support.QuestionTagSupport;
import io.micronaut.core.annotation.Creator;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.serde.annotation.Serdeable;

import java.time.LocalDateTime;
import java.util.List;

@Serdeable
public record QuestionResponse(
    Long id,
    String text,
    String category,
    String tag,
    List<String> tags,
    String explanation,
    String examTypeCode,
    String examTypeName,
    List<AnswerOptionResponse> answerOptions,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    @Nullable String learningStatus
) {
    @Creator
    public QuestionResponse {
        tags = tags != null ? List.copyOf(tags) : QuestionTagSupport.parse(tag);
    }

    public QuestionResponse(
        Long id,
        String text,
        String category,
        String tag,
        List<String> tags,
        String explanation,
        String examTypeCode,
        String examTypeName,
        List<AnswerOptionResponse> answerOptions,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
        this(id, text, category, tag, tags, explanation,
                examTypeCode, examTypeName, answerOptions, createdAt, updatedAt, null);
    }

    public QuestionResponse(
        Long id,
        String text,
        String category,
        String tag,
        String explanation,
        String examTypeCode,
        String examTypeName,
        List<AnswerOptionResponse> answerOptions,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
        this(id, text, category, tag, QuestionTagSupport.parse(tag), explanation,
                examTypeCode, examTypeName, answerOptions, createdAt, updatedAt, null);
    }

    public static QuestionResponse from(Question q) {
        return from(q, null);
    }

    public static QuestionResponse from(Question q, @Nullable String learningStatus) {
        List<String> parsedTags = q.getTags();
        return new QuestionResponse(
            q.getId(),
            q.getText(),
            q.getCategory(),
            QuestionTagSupport.join(parsedTags),
            parsedTags,
            q.getExplanation(),
            q.getExamType().getCode(),
            q.getExamType().getName(),
            q.getAnswerOptions().stream().map(AnswerOptionResponse::from).toList(),
            q.getCreatedAt(),
            q.getUpdatedAt(),
            learningStatus
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
