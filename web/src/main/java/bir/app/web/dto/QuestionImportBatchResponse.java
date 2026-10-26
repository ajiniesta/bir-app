package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Resumen de un lote de importación, tal y como lo consume la barra de progreso.
 *
 * @param index       lote procesado (0-based)
 * @param totalBatches lotes totales del fichero
 * @param total       preguntas del lote
 * @param imported    preguntas guardadas
 * @param skipped     preguntas descartadas (ver {@code errors})
 * @param duplicates  preguntas omitidas por existir ya
 * @param errors      errores de parseo o validación del lote
 */
@Serdeable
public record QuestionImportBatchResponse(
    int index,
    int totalBatches,
    int total,
    int imported,
    int skipped,
    int duplicates,
    List<String> errors
) {
    public QuestionImportBatchResponse {
        errors = errors == null ? List.of() : List.copyOf(errors);
    }
}
