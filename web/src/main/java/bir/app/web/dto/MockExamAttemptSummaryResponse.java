package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.time.LocalDateTime;

/** Espejo de {@code bir.app.api.dto.MockExamAttemptSummaryResponse}. */
@Serdeable
public record MockExamAttemptSummaryResponse(
    Long id,
    boolean finished,
    LocalDateTime startedAt,
    LocalDateTime finishedAt,
    int totalQuestions,
    int answeredCount,
    int correctCount,
    double accuracy
) {}
