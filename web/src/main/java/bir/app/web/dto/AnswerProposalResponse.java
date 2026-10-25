package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.time.LocalDateTime;
import java.util.List;

/** Espejo de {@code bir.app.api.dto.AnswerProposalResponse}. */
@Serdeable
public record AnswerProposalResponse(
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
    public AnswerProposalResponse {
        if (options == null) {
            options = List.of();
        }
    }

    @Serdeable
    public record Option(String letter, String text, boolean isCorrect) {}
}
