package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/** Espejo del resultado de importación que devuelve la API. */
@Serdeable
public record QuestionImportResponse(
    int total,
    int imported,
    int skipped,
    List<String> errors
) {
    public QuestionImportResponse {
        errors = errors == null ? List.of() : List.copyOf(errors);
    }
}
