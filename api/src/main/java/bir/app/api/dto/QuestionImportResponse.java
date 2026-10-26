package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Resultado de una importación masiva de preguntas.
 *
 * @param total      preguntas detectadas en el fichero
 * @param imported   preguntas guardadas correctamente
 * @param skipped    preguntas descartadas por un error de parseo o validación
 *                   (el motivo está en {@code errors})
 * @param duplicates preguntas omitidas porque su enunciado ya existía en el
 *                   mismo banco (o se repetía dentro del propio fichero)
 * @param errors     errores de parseo o validación, numerados por pregunta
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
}
