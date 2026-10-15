package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

/**
 * Espejo de {@code bir.app.api.dto.ExamTypeResponse}.
 */
@Serdeable
public record ExamTypeResponse(
    Long id,
    String code,
    String name
) {}
