package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

/** Formulario de cambio de rol en el panel de administración. */
@Serdeable
public record RoleForm(String role) {}
