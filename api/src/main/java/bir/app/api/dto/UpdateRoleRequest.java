package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.NotBlank;

/**
 * Cambio de rol de un usuario por parte de un administrador.
 *
 * @param role nombre del rol: {@code ADMIN}, {@code CREATOR} o {@code USER}
 */
@Serdeable
public record UpdateRoleRequest(
    @NotBlank String role
) {}
