package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

/** Cuerpo del formulario de login (usuario + contraseña). */
@Serdeable
public record LoginForm(String username, String password) {}
