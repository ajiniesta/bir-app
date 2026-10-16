package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

/** Datos del formulario de registro (y cuerpo de {@code /api/auth/register}). */
@Serdeable
public record RegisterRequest(String username, String password, String displayName) {}
