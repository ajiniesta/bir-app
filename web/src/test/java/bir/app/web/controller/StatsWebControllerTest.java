package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.LoginResponse;
import bir.app.web.dto.ProposalCountResponse;
import bir.app.web.dto.StatsOverviewResponse;
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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@MicronautTest
@DisplayName("StatsWebController (HTTP)")
class StatsWebControllerTest {

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
        WebTestSupport.stubAdminLogin(apiClient);
        when(apiClient.pendingProposalCount()).thenReturn(new ProposalCountResponse(0));
        client = httpClient.toBlocking();
    }

    private static StatsOverviewResponse overview(boolean withGlobal) {
        StatsOverviewResponse.Summary mine = new StatsOverviewResponse.Summary(
                2, 1, 5, 3, 60.0,
                List.of(new StatsOverviewResponse.CategoryStats("Anatomía", 2, 1, 50.0),
                        new StatsOverviewResponse.CategoryStats("Bioquímica", 0, 0, 0.0)));
        StatsOverviewResponse.Global global = withGlobal
                ? new StatsOverviewResponse.Global(
                        3, 5, 2, 9, 6, 66.7,
                        List.of(new StatsOverviewResponse.CategoryStats("Anatomía", 4, 2, 50.0)),
                        List.of(new StatsOverviewResponse.UserStats("demo", "Demo", 6, 4, 66.7),
                                new StatsOverviewResponse.UserStats("admin", "Admin", 3, 2, 66.7)))
                : null;
        return new StatsOverviewResponse(mine, global);
    }

    @Test
    @DisplayName("un ADMIN ve el gráfico, la tabla por categoría y la vista global")
    void adminSeesGlobalStats() {
        when(apiClient.statsOverview()).thenReturn(overview(true));
        String cookie = WebTestSupport.login(client);

        HttpResponse<String> response = client.exchange(
                WebTestSupport.get("/estadisticas", cookie), String.class);

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        assertThat(response.body()).contains("Tus resultados por categoría");
        assertThat(response.body()).contains("Estadísticas globales");
        assertThat(response.body()).contains("Anatomía");
        assertThat(response.body()).contains("Bioquímica");
        assertThat(response.body()).contains("data-category=\"Anatomía\"");
        assertThat(response.body()).contains("chart.umd.min.js");
        assertThat(response.body()).contains("Demo");
    }

    @Test
    @DisplayName("un USER ve solo sus estadísticas, sin el bloque global")
    void userDoesNotSeeGlobalStats() {
        when(apiClient.login(any())).thenReturn(new LoginResponse(
                "jwt", "bearer", 3600, "demo", List.of("ROLE_USER")));
        when(apiClient.statsOverview()).thenReturn(overview(false));
        String cookie = WebTestSupport.login(client);

        HttpResponse<String> response = client.exchange(
                WebTestSupport.get("/estadisticas", cookie), String.class);

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        assertThat(response.body()).contains("Tus resultados por categoría");
        assertThat(response.body()).doesNotContain("Estadísticas globales");
        assertThat(response.body()).doesNotContain("Resultados por usuario");
    }

    @Test
    @DisplayName("si la API falla, se muestra el mensaje de error")
    void showsErrorWhenApiFails() {
        when(apiClient.statsOverview()).thenThrow(new IllegalStateException("boom"));
        String cookie = WebTestSupport.login(client);

        HttpResponse<String> response = client.exchange(
                WebTestSupport.get("/estadisticas", cookie), String.class);

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        assertThat(response.body()).contains("No se pudieron cargar las estadísticas");
        assertThat(response.body()).contains("boom");
    }
}
