package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;

/**
 * Petición de limpieza de duplicados.
 *
 * @param examType  código del banco a limpiar; vacío o {@code null} = todos
 * @param maxGroups número máximo de grupos a procesar en esta pasada (por defecto
 *                  {@code QuestionDuplicatesService.DEFAULT_MAX_GROUPS}); el resto
 *                  se devuelve en {@code remaining}
 */
@Serdeable
public record DuplicatePurgeRequest(String examType, Integer maxGroups) {}
