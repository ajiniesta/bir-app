package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

/** Espejo de {@code bir.app.api.dto.UserResponse}. */
@Serdeable
public record UserResponse(Long id, String username, String displayName, String role) {}
