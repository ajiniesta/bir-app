package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Espejo de {@code bir.app.api.dto.DashboardStatsResponse}.
 */
@Serdeable
public record DashboardStatsResponse(
    long totalQuestions,
    List<ExamTypeStats> byExamType
) {
    @Serdeable
    public record ExamTypeStats(
        String code,
        String name,
        long total
    ) {}
}
