package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.CreateAnswerProposalRequest;
import bir.app.web.dto.CreateFreeSessionRequest;
import bir.app.web.dto.FreeSessionResponse;
import bir.app.web.dto.ProposalCountResponse;
import bir.app.web.support.WebTestSupport;
import io.micronaut.http.HttpHeaders;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.client.BlockingHttpClient;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import io.micronaut.test.annotation.MockBean;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@MicronautTest
@DisplayName("FreeSessionWebController (HTTP)")
class FreeSessionWebControllerTest {

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

    private static FreeSessionResponse session() {
        FreeSessionResponse.Item item = new FreeSessionResponse.Item(
                1, 10L, "¿Pregunta?", "Anatomía", "Tema 1", "Porque sí",
                List.of(new FreeSessionResponse.Option("A", "Uno"),
                        new FreeSessionResponse.Option("B", "Dos")),
                true, "A", true, "A");
        return new FreeSessionResponse(1L, "MIR", "MIR", "Anatomía", "Tema 1",
                1, 1, 1, true, List.of(item));
    }

    @Test
    @DisplayName("iniciar una partida envía el tag seleccionado")
    void startSessionSendsTag() {
        when(apiClient.createFreeSession(any(CreateFreeSessionRequest.class))).thenReturn(session());

        HttpResponse<?> response = client.exchange(WebTestSupport.postForm(
                "/free", cookie, "examTypeCode=MIR&category=Anatom%C3%ADa&tag=Tema+1&count=5"));

        assertThat(response.getStatus().getCode()).isEqualTo(303);
        assertThat(response.getHeaders().get(HttpHeaders.LOCATION)).isEqualTo("/free/1");

        ArgumentCaptor<CreateFreeSessionRequest> captor =
                ArgumentCaptor.forClass(CreateFreeSessionRequest.class);
        verify(apiClient).createFreeSession(captor.capture());
        assertThat(captor.getValue().examTypeCode()).isEqualTo("MIR");
        assertThat(captor.getValue().category()).isEqualTo("Anatomía");
        assertThat(captor.getValue().tag()).isEqualTo("Tema 1");
        assertThat(captor.getValue().count()).isEqualTo(5);
    }

    @Test
    @DisplayName("el resultado muestra el tag y la explicación de la partida")
    void resultShowsTagAndExplanation() {
        when(apiClient.getFreeSession(1L)).thenReturn(session());

        HttpResponse<String> response = client.exchange(
                WebTestSupport.get("/free/1/result", cookie), String.class);

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        assertThat(response.body()).contains("Tema 1");
        assertThat(response.body()).contains("Porque sí");
    }

    @Test
    @DisplayName("proponer una respuesta desde el feedback envía el contexto de la partida")
    void proposeFromFeedback() {
        when(apiClient.proposeAnswer(any(CreateAnswerProposalRequest.class))).thenReturn(null);
        String body = "questionId=10&position=1&selectedLetter=A"
                + "&proposedLetter=B&proposedText=Nueva+opci%C3%B3n&comment=Motivo";

        HttpResponse<?> response = client.exchange(
                WebTestSupport.postForm("/free/1/proposals", cookie, body));

        assertThat(response.getStatus().getCode()).isEqualTo(303);
        assertThat(response.getHeaders().get(HttpHeaders.LOCATION))
                .isEqualTo("/free/1?answered=1&proposed=1");

        ArgumentCaptor<CreateAnswerProposalRequest> captor =
                ArgumentCaptor.forClass(CreateAnswerProposalRequest.class);
        verify(apiClient).proposeAnswer(captor.capture());
        assertThat(captor.getValue().questionId()).isEqualTo(10L);
        assertThat(captor.getValue().source()).isEqualTo("FREE_SESSION");
        assertThat(captor.getValue().sourceId()).isEqualTo(1L);
        assertThat(captor.getValue().position()).isEqualTo(1);
        assertThat(captor.getValue().selectedLetter()).isEqualTo("A");
        assertThat(captor.getValue().proposedLetter()).isEqualTo("B");
        assertThat(captor.getValue().proposedText()).isEqualTo("Nueva opción");
        assertThat(captor.getValue().comment()).isEqualTo("Motivo");
    }

    @Test
    @DisplayName("si la propuesta falla, vuelve al feedback con el error")
    void proposalErrorRedirectsWithMessage() {
        when(apiClient.proposeAnswer(any(CreateAnswerProposalRequest.class)))
                .thenThrow(new IllegalArgumentException("El motivo es obligatorio"));
        String body = "questionId=10&position=1&selectedLetter=A&proposedLetter=B&comment=";

        HttpResponse<?> response = client.exchange(
                WebTestSupport.postForm("/free/1/proposals", cookie, body));

        assertThat(response.getStatus().getCode()).isEqualTo(303);
        assertThat(response.getHeaders().get(HttpHeaders.LOCATION))
                .startsWith("/free/1?answered=1&proposalError=");
    }
}
