package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Estadísticas de simulacros del usuario autenticado: globales y desglosadas
 * por simulacro.
 */
@Serdeable
public record MockExamStatsResponse(
    long attempts,
    long finished,
    double averageAccuracy,
    Double bestAccuracy,
    List<ByMockExam> byMockExam
) {
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
