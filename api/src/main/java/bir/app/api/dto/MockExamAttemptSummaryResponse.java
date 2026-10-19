package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.time.LocalDateTime;

/**
 * Fila del historial de intentos de un usuario sobre un simulacro.
 */
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
