package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Espejo del resultado de importación que devuelve la API.
 *
 * @param total      preguntas detectadas
 * @param imported   preguntas guardadas
 * @param skipped    preguntas descartadas (ver {@code errors})
 * @param duplicates preguntas omitidas porque ya existían en el mismo banco
 * @param errors     errores de parseo o validación
 */
@Serdeable
public record QuestionImportResponse(
    int total,
    int imported,
    int skipped,
    int duplicates,
    List<String> errors
) {
    public QuestionImportResponse {
        errors = errors == null ? List.of() : List.copyOf(errors);
    }

    /** Suma otro resumen (importación por lotes). */
    public QuestionImportResponse plus(QuestionImportResponse other) {
        if (other == null) {
            return this;
        }
        List<String> mergedErrors = new java.util.ArrayList<>(errors);
        mergedErrors.addAll(other.errors());
        return new QuestionImportResponse(
                total + other.total(),
                imported + other.imported(),
                skipped + other.skipped(),
                duplicates + other.duplicates(),
                mergedErrors);
    }

    /** Resumen vacío, para empezar a acumular lotes. */
    public static QuestionImportResponse empty() {
        return new QuestionImportResponse(0, 0, 0, 0, List.of());
    }
}
