package bir.app.api.dto;

import bir.app.api.support.QuestionTagSupport;
import io.micronaut.core.annotation.Creator;
import io.micronaut.serde.annotation.Serdeable;

import java.time.LocalDateTime;
import java.util.List;

/** Propuesta con el contexto de la pregunta para la bandeja de revisión. */
@Serdeable
public record AnswerProposalResponse(
    Long id,
    Long questionId,
    String questionText,
    String category,
    String tag,
    List<String> tags,
    String examTypeCode,
    String correctLetter,
    List<Option> options,
    String proposedBy,
    String proposedByDisplayName,
    String proposedLetter,
    String proposedText,
    String comment,
    String source,
    Long sourceId,
    Integer position,
    String selectedLetter,
    String status,
    LocalDateTime createdAt,
    String reviewedBy,
    LocalDateTime reviewedAt,
    String reviewerNote,
    String appliedBy,
    LocalDateTime appliedAt
) {
    @Creator
    public AnswerProposalResponse {
        tags = tags != null ? List.copyOf(tags) : QuestionTagSupport.parse(tag);
    }

    public AnswerProposalResponse(
        Long id,
        Long questionId,
        String questionText,
        String category,
        String tag,
        String examTypeCode,
        String correctLetter,
        List<Option> options,
        String proposedBy,
        String proposedByDisplayName,
        String proposedLetter,
        String proposedText,
        String comment,
        String source,
        Long sourceId,
        Integer position,
        String selectedLetter,
        String status,
        LocalDateTime createdAt,
        String reviewedBy,
        LocalDateTime reviewedAt,
        String reviewerNote,
        String appliedBy,
        LocalDateTime appliedAt
    ) {
        this(id, questionId, questionText, category, tag, QuestionTagSupport.parse(tag),
                examTypeCode, correctLetter, options, proposedBy, proposedByDisplayName,
                proposedLetter, proposedText, comment, source, sourceId, position,
                selectedLetter, status, createdAt, reviewedBy, reviewedAt, reviewerNote,
                appliedBy, appliedAt);
    }

    /** Opción con la marca de correcta para que el revisor pueda evaluarla. */
    @Serdeable
    public record Option(String letter, String text, boolean isCorrect) {}
}
