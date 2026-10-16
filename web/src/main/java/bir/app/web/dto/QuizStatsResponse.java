package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/** Espejo de {@code bir.app.api.dto.QuizStatsResponse}. */
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
