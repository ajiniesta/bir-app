package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.time.LocalDateTime;
import java.util.List;

/** Espejo de {@code bir.app.api.dto.MockExamStatsResponse}. */
@Serdeable
public record MockExamStatsResponse(
    long attempts,
    long finished,
    double averageAccuracy,
    Double bestAccuracy,
    List<ByMockExam> byMockExam
) {
    public MockExamStatsResponse {
        if (byMockExam == null) {
            byMockExam = List.of();
        }
    }

    @Serdeable
    public record ByMockExam(
        Long mockExamId,
        String title,
        String examTypeCode,
        long attempts,
        long finished,
        double averageAccuracy,
        Double bestAccuracy,
        LocalDateTime lastAttemptAt
    ) {}
}
