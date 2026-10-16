package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

/** Credenciales tal y como las espera el endpoint {@code /login} de la API. */
@Serdeable
public record LoginRequest(String username, String password) {}
