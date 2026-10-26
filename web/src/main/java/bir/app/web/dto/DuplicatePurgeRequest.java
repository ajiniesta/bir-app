package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

/** Espejo de la petición de limpieza de duplicados que espera la API. */
@Serdeable
public record DuplicatePurgeRequest(String examType, Integer maxGroups) {}
