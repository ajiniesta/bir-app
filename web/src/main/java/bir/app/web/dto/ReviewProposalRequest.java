package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

/** Espejo de {@code bir.app.api.dto.ReviewProposalRequest}. */
@Serdeable
public record ReviewProposalRequest(String status, String note) {}
