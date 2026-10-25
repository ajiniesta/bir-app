package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.ExamTypeResponse;
import bir.app.web.dto.ProposalCountResponse;
import bir.app.web.dto.ReviewProposalRequest;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@MicronautTest
@DisplayName("ReviewWebController (HTTP)")
class ReviewWebControllerTest {

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
        // El menú pide el contador en cada página; aquí simulamos 7 pendientes.
        when(apiClient.pendingProposalCount()).thenReturn(new ProposalCountResponse(7));
        client = httpClient.toBlocking();
        cookie = WebTestSupport.login(client);
    }

    @Test
    @DisplayName("la bandeja filtra por estado y banco y muestra el contador del menú")
    void listFiltersByStatusAndExamType() {
        when(apiClient.listAnswerProposals("PENDING", "MIR")).thenReturn(List.of());
        when(apiClient.listExamTypes()).thenReturn(List.of(new ExamTypeResponse(1L, "MIR", "MIR")));

        HttpResponse<String> response = client.exchange(
                WebTestSupport.get("/revisiones?status=PENDING&examType=MIR", cookie), String.class);

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        verify(apiClient).listAnswerProposals("PENDING", "MIR");
        assertThat(response.body()).contains("7");
    }

    @Test
    @DisplayName("aceptar una propuesta envía el estado y la nota a la API")
    void acceptProposal() {
        when(apiClient.reviewAnswerProposal(eq(5L), any(ReviewProposalRequest.class))).thenReturn(null);

        HttpResponse<?> response = client.exchange(WebTestSupport.postForm(
                "/revisiones/5/review", cookie, "status=ACCEPTED&note=Aprobada"));

        assertThat(response.getStatus().getCode()).isEqualTo(303);
        assertThat(response.getHeaders().get(HttpHeaders.LOCATION))
                .isEqualTo("/revisiones?status=ACCEPTED&saved=1");

        ArgumentCaptor<ReviewProposalRequest> captor = ArgumentCaptor.forClass(ReviewProposalRequest.class);
        verify(apiClient).reviewAnswerProposal(eq(5L), captor.capture());
        assertThat(captor.getValue().status()).isEqualTo("ACCEPTED");
        assertThat(captor.getValue().note()).isEqualTo("Aprobada");
    }

    @Test
    @DisplayName("rechazar normaliza el estado a mayúsculas")
    void rejectProposalNormalizesStatus() {
        when(apiClient.reviewAnswerProposal(eq(6L), any(ReviewProposalRequest.class))).thenReturn(null);

        HttpResponse<?> response = client.exchange(WebTestSupport.postForm(
                "/revisiones/6/review", cookie, "status=rejected&note=No+procede"));

        assertThat(response.getStatus().getCode()).isEqualTo(303);
        assertThat(response.getHeaders().get(HttpHeaders.LOCATION))
                .isEqualTo("/revisiones?status=REJECTED&saved=1");

        ArgumentCaptor<ReviewProposalRequest> captor = ArgumentCaptor.forClass(ReviewProposalRequest.class);
        verify(apiClient).reviewAnswerProposal(eq(6L), captor.capture());
        assertThat(captor.getValue().status()).isEqualTo("REJECTED");
        assertThat(captor.getValue().note()).isEqualTo("No procede");
    }

    @Test
    @DisplayName("si la revisión falla, redirige con el error codificado")
    void reviewErrorRedirectsWithMessage() {
        when(apiClient.reviewAnswerProposal(eq(7L), any(ReviewProposalRequest.class)))
                .thenThrow(new IllegalArgumentException("Estado no válido"));

        HttpResponse<?> response = client.exchange(WebTestSupport.postForm(
                "/revisiones/7/review", cookie, "status=ACCEPTED"));

        assertThat(response.getStatus().getCode()).isEqualTo(303);
        assertThat(response.getHeaders().get(HttpHeaders.LOCATION))
                .startsWith("/revisiones?status=ACCEPTED&error=");
    }
}
