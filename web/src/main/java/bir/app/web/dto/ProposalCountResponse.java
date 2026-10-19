package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

/** Espejo de {@code bir.app.api.dto.ProposalCountResponse}. */
@Serdeable
public record ProposalCountResponse(long pending) {}
