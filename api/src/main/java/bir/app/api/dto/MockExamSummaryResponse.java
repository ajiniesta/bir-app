package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.time.LocalDateTime;

/**
 * Resumen de un simulacro para el listado, con los datos del usuario
 * autenticado: intentos, mejor nota e intento en curso (si lo hay).
 */
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
