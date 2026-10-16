package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Estadísticas del modo libre: las del usuario autenticado ({@code mine}) y el
 * resumen agregado de toda la aplicación ({@code global}).
 */
@Serdeable
public record QuizStatsResponse(
    Mine mine,
    Global global
) {
    @Serdeable
    public record ExamTypeAccuracy(
        String code,
        String name,
        long answered,
        long correct,
        double accuracy
    ) {}

    @Serdeable
    public record Mine(
        long sessions,
        long answered,
        long correct,
        double accuracy,
        List<ExamTypeAccuracy> byExamType
    ) {}

    @Serdeable
    public record Global(
        long users,
        long sessions,
        long answered,
        long correct,
        double accuracy,
        List<ExamTypeAccuracy> byExamType
    ) {}
}
