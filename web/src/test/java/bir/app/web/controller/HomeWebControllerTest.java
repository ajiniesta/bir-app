package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.support.WebTestSupport;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.client.BlockingHttpClient;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.test.annotation.MockBean;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.assertj.core.api.Assertions.assertThat;

@MicronautTest
@DisplayName("HomeWebController (HTTP)")
class HomeWebControllerTest {

    @Inject
    @Client("/")
    HttpClient httpClient;

    final QuestionApiClient apiClient = Mockito.mock(QuestionApiClient.class);

    @MockBean(QuestionApiClient.class)
    QuestionApiClient mockApiClient() {
        return apiClient;
    }

    BlockingHttpClient client;

    @BeforeEach
    void setUp() {
        Mockito.reset(apiClient);
        client = httpClient.toBlocking();
    }

    @Test
    @DisplayName("la landing anónima declara el viewport y el menú móvil")
    void anonymousLandingIsMobileReady() {
        HttpResponse<String> response = client.exchange(WebTestSupport.get("/", ""), String.class);

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        // Sin esta meta el navegador del móvil renderiza a ~980 px.
        assertThat(response.body()).contains("name=\"viewport\"");
        assertThat(response.body()).contains("width=device-width, initial-scale=1");
        // Barra de navegación plegable y enlaces para quien no tiene sesión.
        assertThat(response.body()).contains("data-bs-target=\"#mainMenu\"");
        assertThat(response.body()).contains("Iniciar sesión");
    }

    @Test
    @DisplayName("la pantalla de login también declara el viewport")
    void loginPageIsMobileReady() {
        HttpResponse<String> response = client.exchange(WebTestSupport.get("/login", ""), String.class);

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        assertThat(response.body()).contains("name=\"viewport\"");
        assertThat(response.body()).contains("Entrar");
    }

    @Test
    @DisplayName("con sesión el menú muestra los enlaces del rol")
    void authenticatedMenuShowsRoleLinks() {
        WebTestSupport.stubAdminLogin(apiClient);
        String cookie = WebTestSupport.login(client);

        HttpResponse<String> response = client.exchange(WebTestSupport.get("/", cookie), String.class);

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        assertThat(response.body()).contains("Modo libre");
        assertThat(response.body()).contains("Simulacros");
        // ADMIN: puede revisar propuestas y gestionar usuarios.
        assertThat(response.body()).contains("Revisiones");
        assertThat(response.body()).contains("Administración");
    }
}
