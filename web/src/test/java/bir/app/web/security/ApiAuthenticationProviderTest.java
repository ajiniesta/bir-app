package bir.app.web.security;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.LoginRequest;
import bir.app.web.dto.LoginResponse;
import io.micronaut.http.HttpRequest;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.authentication.AuthenticationResponse;
import io.micronaut.security.authentication.UsernamePasswordCredentials;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ApiAuthenticationProvider")
class ApiAuthenticationProviderTest {

    @Mock
    QuestionApiClient client;
    @Mock
    HttpRequest<Object> request;

    ApiAuthenticationProvider provider;

    @BeforeEach
    void setUp() {
        provider = new ApiAuthenticationProvider(client);
    }

    private static UsernamePasswordCredentials credentials() {
        return new UsernamePasswordCredentials("demo", "secreto");
    }

    @Test
    @DisplayName("un login correcto guarda el JWT y los roles en la autenticación")
    void successfulLoginKeepsTokenAndRoles() {
        when(client.login(new LoginRequest("demo", "secreto")))
                .thenReturn(new LoginResponse("jwt-token", "bearer", 3600, "demo",
                        List.of("ROLE_ADMIN")));

        AuthenticationResponse response = provider.authenticate(request, credentials());

        assertThat(response.isAuthenticated()).isTrue();
        Authentication authentication = response.getAuthentication().orElseThrow();
        assertThat(authentication.getName()).isEqualTo("demo");
        assertThat(authentication.getRoles()).containsExactly("ROLE_ADMIN");
        assertThat(authentication.getAttributes())
                .containsEntry(ApiAuthenticationProvider.TOKEN_ATTRIBUTE, "jwt-token");
    }

    @Test
    @DisplayName("si la API no devuelve token, el login falla")
    void loginWithoutTokenFails() {
        when(client.login(new LoginRequest("demo", "secreto")))
                .thenReturn(new LoginResponse(null, null, null, "demo", List.of("ROLE_USER")));

        assertThat(provider.authenticate(request, credentials()).isAuthenticated()).isFalse();
    }

    @Test
    @DisplayName("si la API devuelve null, el login falla")
    void loginWithNullResponseFails() {
        when(client.login(new LoginRequest("demo", "secreto"))).thenReturn(null);

        assertThat(provider.authenticate(request, credentials()).isAuthenticated()).isFalse();
    }

    @Test
    @DisplayName("si la API lanza una excepción, el login falla sin propagarla")
    void loginWithApiExceptionFails() {
        when(client.login(new LoginRequest("demo", "secreto")))
                .thenThrow(new IllegalStateException("API caída"));

        assertThat(provider.authenticate(request, credentials()).isAuthenticated()).isFalse();
    }

    @Test
    @DisplayName("si la API no informa roles, se asigna ROLE_USER")
    void loginWithoutRolesDefaultsToUser() {
        when(client.login(new LoginRequest("demo", "secreto")))
                .thenReturn(new LoginResponse("jwt-token", "bearer", 3600, "demo", List.of()));

        AuthenticationResponse response = provider.authenticate(request, credentials());

        assertThat(response.isAuthenticated()).isTrue();
        assertThat(response.getAuthentication().orElseThrow().getRoles()).containsExactly("ROLE_USER");
    }
}
