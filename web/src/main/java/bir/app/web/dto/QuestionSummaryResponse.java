package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

/**
 * Espejo de {@code bir.app.api.dto.QuestionSummaryResponse}.
 */
@Serdeable
public record QuestionSummaryResponse(
    Long id,
    String text,
    String category,
    String tag,
    String examTypeCode
) {}
