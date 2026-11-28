package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;
import java.time.LocalDateTime;
import java.util.List;

@Serdeable
public record ReviewSessionSummaryResponse(
    Long id,
    String examTypeCode,
    String examTypeName,
    List<String> categories,
    List<String> tags,
    boolean onlyDoubt,
    boolean onlyFailed,
    int answeredCount,
    int correctCount,
    int totalMatchingQuestions,
    LocalDateTime createdAt,
    boolean finished
) {
    public ReviewSessionSummaryResponse(
            Long id,
            String examTypeCode,
            String examTypeName,
            List<String> categories,
            List<String> tags,
            int answeredCount,
            int correctCount,
            int totalMatchingQuestions,
            LocalDateTime createdAt,
            boolean finished) {
        this(id, examTypeCode, examTypeName, categories, tags, false, false,
                answeredCount, correctCount, totalMatchingQuestions, createdAt, finished);
    }

    public ReviewSessionSummaryResponse(
            Long id,
            String examTypeCode,
            String examTypeName,
            List<String> categories,
            List<String> tags,
            boolean onlyDoubt,
            int answeredCount,
            int correctCount,
            int totalMatchingQuestions,
            LocalDateTime createdAt,
            boolean finished) {
        this(id, examTypeCode, examTypeName, categories, tags, onlyDoubt, false,
                answeredCount, correctCount, totalMatchingQuestions, createdAt, finished);
    }
}
