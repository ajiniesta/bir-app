package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;

/** Número de propuestas pendientes de revisión (contador del menú). */
@Serdeable
public record ProposalCountResponse(long pending) {}
