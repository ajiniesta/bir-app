package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Espejo de {@code bir.app.api.dto.QuestionPageResponse}.
 */
@Serdeable
public record QuestionPageResponse(
    List<QuestionSummaryResponse> items,
    int page,
    int size,
    long total,
    int totalPages
) {}
