package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;
import java.util.List;

@Serdeable
public record ReviewSessionResponse(
    Long id,
    String examTypeCode,
    String examTypeName,
    List<String> categories,
    List<String> tags,
    boolean onlyDoubt,
    boolean onlyFailed,
    int totalMatchingQuestions,
    int answeredCount,
    int correctCount,
    double accuracy,
    boolean hasMoreQuestions,
    boolean finished,
    List<StatsOverviewResponse.CategoryStats> byCategory,
    List<FreeSessionResponse.Item> items
) {
    public ReviewSessionResponse(
            Long id,
            String examTypeCode,
            String examTypeName,
            List<String> categories,
            List<String> tags,
            int totalMatchingQuestions,
            int answeredCount,
            int correctCount,
            double accuracy,
            boolean hasMoreQuestions,
            boolean finished,
            List<StatsOverviewResponse.CategoryStats> byCategory,
            List<FreeSessionResponse.Item> items) {
        this(id, examTypeCode, examTypeName, categories, tags, false, false,
                totalMatchingQuestions, answeredCount, correctCount, accuracy,
                hasMoreQuestions, finished, byCategory, items);
    }

    public ReviewSessionResponse(
            Long id,
            String examTypeCode,
            String examTypeName,
            List<String> categories,
            List<String> tags,
            boolean onlyDoubt,
            int totalMatchingQuestions,
            int answeredCount,
            int correctCount,
            double accuracy,
            boolean hasMoreQuestions,
            boolean finished,
            List<StatsOverviewResponse.CategoryStats> byCategory,
            List<FreeSessionResponse.Item> items) {
        this(id, examTypeCode, examTypeName, categories, tags, onlyDoubt, false,
                totalMatchingQuestions, answeredCount, correctCount, accuracy,
                hasMoreQuestions, finished, byCategory, items);
    }
}
