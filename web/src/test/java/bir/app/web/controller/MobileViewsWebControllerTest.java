package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.AdminUserResponse;
import bir.app.web.dto.FreeSessionResponse;
import bir.app.web.dto.MockExamAttemptResponse;
import bir.app.web.dto.MockExamAttemptSummaryResponse;
import bir.app.web.dto.MockExamResponse;
import bir.app.web.dto.ProposalCountResponse;
import bir.app.web.dto.QuestionResponse;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Renderiza (sin base de datos, con la API simulada) las vistas que no cubren
 * los demás tests HTTP, para que un fallo de plantilla —un fragmento de layout
 * mal referenciado, por ejemplo— no llegue a producción.
 */
@MicronautTest
@DisplayName("Vistas móviles (HTTP)")
class MobileViewsWebControllerTest {

    @Inject
    @Client("/")
    HttpClient httpClient;

    final QuestionApiClient apiClient = Mockito.mock(QuestionApiClient.class);

    @MockBean(QuestionApiClient.class)
    QuestionApiClient mockApiClient() {
        return apiClient;
    }

    BlockingHttpClient client;
    String cookie;

    @BeforeEach
    void setUp() {
        Mockito.reset(apiClient);
        WebTestSupport.stubAdminLogin(apiClient);
        when(apiClient.pendingProposalCount()).thenReturn(new ProposalCountResponse(0));
        client = httpClient.toBlocking();
        cookie = WebTestSupport.login(client);
    }

    private HttpResponse<String> get(String uri) {
        return client.exchange(WebTestSupport.get(uri, cookie), String.class);
    }

    private static FreeSessionResponse freeSession() {
        return new FreeSessionResponse(1L, "MIR", "Médico Interno Residente", null, "Tema 1", 2, 1, 1, false,
                List.of(
                        new FreeSessionResponse.Item(1, 10L, "¿Pregunta uno?", "Anatomía", "Tema 1", "Explicación",
                                List.of(new FreeSessionResponse.Option("A", "Uno"),
                                        new FreeSessionResponse.Option("B", "Dos")),
                                true, "A", true, "A"),
                        new FreeSessionResponse.Item(2, 11L, "¿Pregunta dos?", null, null, null,
                                List.of(new FreeSessionResponse.Option("A", "Uno"),
                                        new FreeSessionResponse.Option("B", "Dos")),
                                false, null, null, null)));
    }

    private static MockExamAttemptResponse attempt() {
        return new MockExamAttemptResponse(3L, 5L, "Simulacro de prueba", "MIR", "MIR", false,
                LocalDateTime.of(2026, 1, 1, 10, 0), null, 2, 1, 1, 50.0,
                List.of(
                        new MockExamAttemptResponse.Item(1, 10L, "¿Pregunta uno?", "Anatomía", "Tema 1", null,
                                List.of(new MockExamAttemptResponse.Option("A", "Uno"),
                                        new MockExamAttemptResponse.Option("B", "Dos")),
                                true, "A", true, "A"),
                        new MockExamAttemptResponse.Item(2, 11L, "¿Pregunta dos?", null, null, null,
                                List.of(new MockExamAttemptResponse.Option("A", "Uno"),
                                        new MockExamAttemptResponse.Option("B", "Dos")),
                                false, null, null, null)));
    }

    @Test
    @DisplayName("el modo libre se pinta con la barra de acciones fija en móvil")
    void freeQuestionRenders() {
        when(apiClient.getFreeSession(1L)).thenReturn(freeSession());

        HttpResponse<String> response = get("/free/1");

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        assertThat(response.body()).contains("name=\"viewport\"");
        // Pantalla con la barra anclada abajo
        assertThat(response.body()).contains("has-action-bar");
        assertThat(response.body()).contains("action-bar");
        assertThat(response.body()).contains("Responder");
    }

    @Test
    @DisplayName("el intento de simulacro trae el navegador plegable y los botones de guardar")
    void mockExamAttemptRenders() {
        when(apiClient.getMockExamAttempt(3L)).thenReturn(attempt());

        HttpResponse<String> response = get("/simulacros/5/attempts/3");

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        assertThat(response.body()).contains("questionNavigator");
        assertThat(response.body()).contains("Guardar y siguiente");
        assertThat(response.body()).contains("Entregar simulacro");
    }

    @Test
    @DisplayName("el detalle del simulacro se pinta")
    void mockExamDetailRenders() {
        MockExamResponse.QuestionSummary question = new MockExamResponse.QuestionSummary(
                1, 10L, "¿Pregunta?", "Anatomía", "Tema 1", "Explicación",
                List.of(new MockExamResponse.OptionSummary("A", "Uno")));
        when(apiClient.getMockExam(5L)).thenReturn(new MockExamResponse(5L, "Simulacro de prueba",
                "Descripción", "MIR", "MIR", 1, List.of(question)));
        when(apiClient.listMockExamAttempts(5L)).thenReturn(List.of(
                new MockExamAttemptSummaryResponse(3L, false, LocalDateTime.of(2026, 1, 1, 10, 0),
                        null, 1, 0, 0, 0.0)));

        HttpResponse<String> response = get("/simulacros/5");

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        assertThat(response.body()).contains("Simulacro de prueba");
        assertThat(response.body()).contains("Continuar intento en curso");
    }

    @Test
    @DisplayName("el formulario de simulacro se pinta sin banco seleccionado")
    void mockExamFormRenders() {
        HttpResponse<String> response = get("/simulacros/new");

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        assertThat(response.body()).contains("Crear simulacro");
    }

    @Test
    @DisplayName("el detalle de la pregunta y la gestión de usuarios se pintan")
    void questionDetailAndAdminUsersRender() {
        when(apiClient.getQuestion(1L)).thenReturn(Optional.of(new QuestionResponse(1L, "¿Pregunta?",
                "Anatomía", "Tema 1", "Explicación", "MIR", "MIR",
                List.of(new QuestionResponse.AnswerOptionResponse(1L, "A", "Uno", true),
                        new QuestionResponse.AnswerOptionResponse(2L, "B", "Dos", false)),
                LocalDateTime.of(2026, 1, 1, 10, 0), null)));
        when(apiClient.listUsers()).thenReturn(List.of(
                new AdminUserResponse(1L, "admin", "Administración", "ADMIN", List.of("MIR"))));

        HttpResponse<String> question = get("/questions/1");
        assertThat(question.getStatus().getCode()).isEqualTo(200);
        assertThat(question.body()).contains("Pregunta #1");

        HttpResponse<String> users = get("/admin/users");
        assertThat(users.getStatus().getCode()).isEqualTo(200);
        assertThat(users.body()).contains("Administración de usuarios");
    }
}
