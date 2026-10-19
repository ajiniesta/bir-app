package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.time.LocalDateTime;

/** Espejo de {@code bir.app.api.dto.MockExamSummaryResponse}. */
@Serdeable
public record MockExamSummaryResponse(
    Long id,
    String title,
    String description,
    String examTypeCode,
    String examTypeName,
    int questionCount,
    long attemptCount,
    long finishedCount,
    Double bestAccuracy,
    LocalDateTime lastAttemptAt,
    Long inProgressAttemptId
) {}
