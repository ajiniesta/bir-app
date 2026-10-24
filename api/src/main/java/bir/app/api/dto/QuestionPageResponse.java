package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/** Página de preguntas con los datos necesarios para pintar la paginación. */
@Serdeable
public record QuestionPageResponse(
    List<QuestionSummaryResponse> items,
    int page,
    int size,
    long total,
    int totalPages
) {}
