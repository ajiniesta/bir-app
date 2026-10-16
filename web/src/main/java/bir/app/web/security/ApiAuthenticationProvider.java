package bir.app.web.security;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.LoginRequest;
import bir.app.web.dto.LoginResponse;
import io.micronaut.http.HttpRequest;
import io.micronaut.security.authentication.AuthenticationFailureReason;
import io.micronaut.security.authentication.AuthenticationRequest;
import io.micronaut.security.authentication.AuthenticationResponse;
import io.micronaut.security.authentication.provider.HttpRequestAuthenticationProvider;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Autenticación de la app web contra la API: delega en {@code /login} y, si las
 * credenciales son válidas, guarda el JWT en los atributos de la autenticación
 * de sesión (de donde lo toma {@link ApiTokenFilter} para reenviarlo).
 */
@Singleton
public class ApiAuthenticationProvider implements HttpRequestAuthenticationProvider<Object> {

    static final String TOKEN_ATTRIBUTE = "apiToken";

    private static final Logger LOG = LoggerFactory.getLogger(ApiAuthenticationProvider.class);

    private final QuestionApiClient client;

    public ApiAuthenticationProvider(QuestionApiClient client) {
        this.client = client;
    }

    @Override
    public AuthenticationResponse authenticate(HttpRequest<Object> requestContext,
                                              AuthenticationRequest<String, String> authenticationRequest) {
        try {
            LoginResponse token = client.login(new LoginRequest(
                    String.valueOf(authenticationRequest.getIdentity()),
                    String.valueOf(authenticationRequest.getSecret())));
            if (token == null || token.accessToken() == null) {
                return AuthenticationResponse.failure(AuthenticationFailureReason.CREDENTIALS_DO_NOT_MATCH);
            }
            Collection<String> roles = token.roles() == null || token.roles().isEmpty()
                    ? List.of("ROLE_USER")
                    : token.roles();
            return AuthenticationResponse.success(
                    token.username(), roles, Map.of(TOKEN_ATTRIBUTE, token.accessToken()));
        } catch (Exception e) {
            LOG.debug("Fallo al validar credenciales contra la API: {}", e.getMessage(), e);
            return AuthenticationResponse.failure(AuthenticationFailureReason.CREDENTIALS_DO_NOT_MATCH);
        }
    }
}
