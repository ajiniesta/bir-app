package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;

/**
 * Petición de importación masiva: el texto crudo del fichero de preguntas.
 */
@Serdeable
public record QuestionImportRequest(String content) {}
