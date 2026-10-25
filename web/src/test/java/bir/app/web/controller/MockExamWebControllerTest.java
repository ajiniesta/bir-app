package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.CreateMockExamRequest;
import bir.app.web.dto.MockExamResponse;
import bir.app.web.dto.ProposalCountResponse;
import bir.app.web.support.WebTestSupport;
import io.micronaut.http.HttpHeaders;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.BlockingHttpClient;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.http.client.exceptions.HttpClientResponseException;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import io.micronaut.test.annotation.MockBean;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.LongStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@MicronautTest
@DisplayName("MockExamWebController (HTTP)")
class MockExamWebControllerTest {

    @Inject
    @Client("/")
    HttpClient httpClient;

    /**
     * Micronaut lee el mock del método anotado con {@code @MockBean}; así el
     * campo queda accesible en el test para stubs y verificaciones.
     */
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

    private static MockExamResponse exam() {
        MockExamResponse.QuestionSummary question = new MockExamResponse.QuestionSummary(
                1, 10L, "¿Pregunta?", "Anatomía", "Tema 1", "Explicación",
                List.of(new MockExamResponse.OptionSummary("A", "Uno"),
                        new MockExamResponse.OptionSummary("B", "Dos")));
        return new MockExamResponse(5L, "Simulacro de prueba", "Descripción",
                "MIR", "MIR", 1, List.of(question));
    }

    @Test
    @DisplayName("acepta 210 questionIds en el formulario (regresión del límite de 128 campos)")
    void createWith210Questions() {
        StringBuilder body = new StringBuilder("title=Simulacro&description=Descripcion&examTypeId=1");
        for (long id = 1; id <= 210; id++) {
            body.append("&questionIds=").append(id);
        }
        when(apiClient.createMockExam(any(CreateMockExamRequest.class)))
                .thenReturn(new MockExamResponse(77L, "Simulacro", null, "MIR", "MIR", 210, List.of()));

        HttpResponse<?> response = client.exchange(
                WebTestSupport.postForm("/simulacros/new", cookie, body.toString()));

        assertThat(response.getStatus().getCode()).isEqualTo(303);
        assertThat(response.getHeaders().get(HttpHeaders.LOCATION)).isEqualTo("/simulacros/77");

        ArgumentCaptor<CreateMockExamRequest> captor = ArgumentCaptor.forClass(CreateMockExamRequest.class);
        verify(apiClient).createMockExam(captor.capture());
        assertThat(captor.getValue().questionIds())
                .containsExactlyElementsOf(LongStream.rangeClosed(1, 210).boxed().toList());
    }

    @Test
    @DisplayName("si la API rechaza 211 preguntas, vuelve al formulario con el error")
    void createWith211QuestionsShowsError() {
        StringBuilder body = new StringBuilder("title=Simulacro&description=Descripcion&examTypeId=1");
        for (long id = 1; id <= 211; id++) {
            body.append("&questionIds=").append(id);
        }
        when(apiClient.createMockExam(any(CreateMockExamRequest.class)))
                .thenThrow(new IllegalArgumentException("Un simulacro no puede tener más de 210 preguntas"));
        when(apiClient.listExamTypes()).thenReturn(List.of());
        when(apiClient.listQuestions()).thenReturn(List.of());

        HttpResponse<String> response = client.exchange(
                WebTestSupport.postForm("/simulacros/new", cookie, body.toString()), String.class);

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        assertThat(response.body()).contains("más de 210 preguntas");
    }

    @Test
    @DisplayName("descarga el PDF del simulacro")
    void downloadPdf() {
        when(apiClient.getMockExam(5L)).thenReturn(exam());

        HttpResponse<byte[]> response = client.exchange(
                WebTestSupport.get("/simulacros/5/pdf", cookie), byte[].class);

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        assertThat(response.getHeaders().get(HttpHeaders.CONTENT_TYPE)).startsWith(MediaType.APPLICATION_PDF);
        assertThat(response.getHeaders().get(HttpHeaders.CONTENT_DISPOSITION))
                .contains("simulacro-5-simulacro-de-prueba.pdf");
        assertThat(new String(response.body(), 0, 4, StandardCharsets.US_ASCII)).isEqualTo("%PDF");
    }

    @Test
    @DisplayName("un PDF de un simulacro inexistente devuelve 404")
    void downloadPdfNotFound() {
        when(apiClient.getMockExam(99L)).thenThrow(new RuntimeException("Simulacro no encontrado"));

        // El cliente HTTP de Micronaut convierte las respuestas de error en excepción.
        HttpClientResponseException error = catchThrowableOfType(
                () -> client.exchange(WebTestSupport.get("/simulacros/99/pdf", cookie), String.class),
                HttpClientResponseException.class);

        assertThat(error).isNotNull();
        assertThat(error.getStatus().getCode()).isEqualTo(404);
        assertThat(error.getResponse().getBody(String.class)).contains("Simulacro no encontrado");
    }

    @Test
    @DisplayName("sin sesión redirige al login")
    void anonymousRedirectsToLogin() {
        HttpResponse<?> response = client.exchange(
                HttpRequest.GET("/simulacros").accept(MediaType.TEXT_HTML));

        assertThat(response.getStatus().getCode()).isBetween(300, 399);
        assertThat(response.getHeaders().get(HttpHeaders.LOCATION)).contains("/login");
    }
}
