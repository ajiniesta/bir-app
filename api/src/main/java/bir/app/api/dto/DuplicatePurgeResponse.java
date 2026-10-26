package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Resultado de una pasada de la limpieza de duplicados.
 *
 * @param groupsProcessed        grupos de duplicadas procesados
 * @param deleted                preguntas duplicadas borradas
 * @param mockExamLinksRepointed apariciones en simulacros re-apuntadas al conservado
 * @param mockExamLinksRemoved   apariciones eliminadas porque el simulacro ya tenía
 *                               la pregunta conservada
 * @param positionsRenumbered    simulacros cuyas posiciones se han renumerado
 * @param proposalsRepointed     propuestas re-apuntadas al conservado
 * @param proposalsDeleted       propuestas borradas porque el usuario ya tenía una
 *                               propuesta sobre el conservado
 * @param sessionItemsRepointed  ítems de sesiones libres re-apuntados al conservado
 * @param remaining              grupos que quedan para la siguiente pasada
 * @param notes                  avisos legibles para mostrar al usuario
 */
@Serdeable
public record DuplicatePurgeResponse(
    int groupsProcessed,
    int deleted,
    int mockExamLinksRepointed,
    int mockExamLinksRemoved,
    int positionsRenumbered,
    int proposalsRepointed,
    int proposalsDeleted,
    int sessionItemsRepointed,
    int remaining,
    List<String> notes
) {
    public DuplicatePurgeResponse {
        notes = notes == null ? List.of() : List.copyOf(notes);
    }
}
