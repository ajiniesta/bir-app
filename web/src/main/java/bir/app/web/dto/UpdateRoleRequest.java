package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

/** Espejo de {@code bir.app.api.dto.UpdateRoleRequest}. */
@Serdeable
public record UpdateRoleRequest(String role) {}
