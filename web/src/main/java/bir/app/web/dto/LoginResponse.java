package bir.app.web.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Respuesta del endpoint {@code /login} de la API (micronaut-security, modo bearer).
 * Se define un DTO propio en lugar de reutilizar {@code BearerAccessRefreshToken}
 * porque este último no es deserializable por Micronaut Serde.
 */
@Serdeable
public record LoginResponse(
    @JsonProperty("access_token") String accessToken,
    @JsonProperty("token_type") String tokenType,
    @JsonProperty("expires_in") Integer expiresIn,
    String username,
    List<String> roles
) {}
