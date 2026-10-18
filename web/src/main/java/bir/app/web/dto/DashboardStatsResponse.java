package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Espejo de {@code bir.app.api.dto.DashboardStatsResponse}. La API omite las
 * listas vacías al serializar, así que normalizamos {@code byExamType} a una
 * lista vacía para que las plantillas nunca reciban {@code null}.
 */
@Serdeable
public record DashboardStatsResponse(
    long totalQuestions,
    List<ExamTypeStats> byExamType
) {
    public DashboardStatsResponse {
        if (byExamType == null) {
            byExamType = List.of();
        }
    }

    @Serdeable
    public record ExamTypeStats(
        String code,
        String name,
        long total
    ) {}
}
