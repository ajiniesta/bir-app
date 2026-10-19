package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

/** Espejo de {@code bir.app.api.dto.CreateAnswerProposalRequest}. */
@Serdeable
public record CreateAnswerProposalRequest(
    Long questionId,
    String proposedLetter,
    String proposedText,
    String comment,
    String source,
    Long sourceId,
    Integer position,
    String selectedLetter
) {}
