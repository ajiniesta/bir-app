package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

/** Espejo de {@code bir.app.api.dto.MyProposalResponse}. */
@Serdeable
public record MyProposalResponse(
    Long id,
    Long questionId,
    String status,
    String proposedLetter,
    String proposedText,
    String comment
) {}
