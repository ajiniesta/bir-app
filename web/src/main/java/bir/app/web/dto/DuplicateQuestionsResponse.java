package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/** Espejo de la vista previa de duplicados que devuelve la API. */
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

    /** Grupo de preguntas equivalentes: la conservada y las que se borrarían. */
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

    /** Datos de una pregunta del grupo. */
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
