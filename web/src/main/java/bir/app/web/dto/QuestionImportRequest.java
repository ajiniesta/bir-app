package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

/** Espejo de la petición de importación que espera la API. */
@Serdeable
public record QuestionImportRequest(String content) {}
