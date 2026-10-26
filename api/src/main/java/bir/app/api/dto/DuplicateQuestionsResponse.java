package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Resultado de la búsqueda de preguntas duplicadas (solo lectura, vista previa).
 *
 * @param groups        grupos de duplicadas (como mucho {@code MAX_PREVIEW_GROUPS})
 * @param totalGroups   grupos encontrados en total (puede ser mayor que los listados)
 * @param totalDuplicates preguntas que se borrarían en total
 * @param truncated     {@code true} si no se listan todos los grupos
 * @param similarGroups enunciados repetidos pero con opciones distintas: se
 *                      informan para revisarlos a mano, no se borran
 */
@Serdeable
public record DuplicateQuestionsResponse(
    List<DuplicateQuestionGroup> groups,
    int totalGroups,
    int totalDuplicates,
    boolean truncated,
    List<SimilarTextGroup> similarGroups
) {
    public DuplicateQuestionsResponse {
        groups = groups == null ? List.of() : List.copyOf(groups);
        similarGroups = similarGroups == null ? List.of() : List.copyOf(similarGroups);
    }

    /**
     * Grupo de preguntas equivalentes: la conservada y las que se borrarían.
     *
     * @param text        enunciado de la conservada
     * @param keepId      id de la pregunta que se mantiene
     * @param keepReason  por qué se conserva esa (para mostrarlo en la vista)
     * @param duplicates  preguntas del grupo que se borrarán
     */
    @Serdeable
    public record DuplicateQuestionGroup(
        Long examTypeId,
        String examTypeCode,
        String text,
        Long keepId,
        String keepReason,
        List<DuplicateCandidate> duplicates
    ) {
        public DuplicateQuestionGroup {
            duplicates = duplicates == null ? List.of() : List.copyOf(duplicates);
        }
    }

    /** Datos de una pregunta del grupo, para poder revisarla antes de borrar. */
    @Serdeable
    public record DuplicateCandidate(
        Long id,
        String category,
        String tag,
        boolean hasExplanation,
        int optionCount,
        boolean inMockExam,
        boolean hasProposals,
        boolean inFreeSessions
    ) {}

    /** Mismo enunciado en el mismo banco pero con opciones distintas. */
    @Serdeable
    public record SimilarTextGroup(
        Long examTypeId,
        String examTypeCode,
        String text,
        List<Long> questionIds
    ) {
        public SimilarTextGroup {
            questionIds = questionIds == null ? List.of() : List.copyOf(questionIds);
        }
    }
}
