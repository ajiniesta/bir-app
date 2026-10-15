package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Estadísticas del banco de preguntas: total y desglose por tipo de examen.
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
