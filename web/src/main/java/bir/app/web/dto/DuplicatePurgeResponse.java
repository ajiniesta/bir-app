package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.ArrayList;
import java.util.List;

/** Espejo del resultado de una pasada de la limpieza de duplicados. */
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

    /** Resumen vacío, para empezar a acumular pasadas. */
    public static DuplicatePurgeResponse empty() {
        return new DuplicatePurgeResponse(0, 0, 0, 0, 0, 0, 0, 0, 0, List.of());
    }

    /** Acumula el resultado de otra pasada (respaldo sin JavaScript). */
    public DuplicatePurgeResponse plus(DuplicatePurgeResponse other) {
        if (other == null) {
            return this;
        }
        List<String> mergedNotes = new ArrayList<>(notes);
        mergedNotes.addAll(other.notes());
        return new DuplicatePurgeResponse(
                groupsProcessed + other.groupsProcessed(),
                deleted + other.deleted(),
                mockExamLinksRepointed + other.mockExamLinksRepointed(),
                mockExamLinksRemoved + other.mockExamLinksRemoved(),
                positionsRenumbered + other.positionsRenumbered(),
                proposalsRepointed + other.proposalsRepointed(),
                proposalsDeleted + other.proposalsDeleted(),
                sessionItemsRepointed + other.sessionItemsRepointed(),
                other.remaining(),
                mergedNotes);
    }
}
