package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;

/** Resumen de la propuesta del propio usuario para una pregunta (estado en la UI). */
@Serdeable
public record MyProposalResponse(
    Long id,
    Long questionId,
    String status,
    String proposedLetter,
    String proposedText,
    String comment
) {}
