package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Veredicto del revisor: {@code ACCEPTED} o {@code REJECTED}, con nota opcional. */
@Serdeable
public record ReviewProposalRequest(
    @NotBlank String status,
    @Size(max = 2000) String note
) {}
