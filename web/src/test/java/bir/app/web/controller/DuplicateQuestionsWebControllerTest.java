package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.DuplicatePurgeRequest;
import bir.app.web.dto.DuplicatePurgeResponse;
import bir.app.web.dto.DuplicateQuestionsResponse;
import bir.app.web.dto.ExamTypeResponse;
import bir.app.web.dto.ProposalCountResponse;
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
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@MicronautTest
@DisplayName("QuestionWebController: duplicadas (HTTP)")
class DuplicateQuestionsWebControllerTest {

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
        when(apiClient.listExamTypes()).thenReturn(List.of(new ExamTypeResponse(1L, "MIR", "MIR")));
        client = httpClient.toBlocking();
        cookie = WebTestSupport.login(client);
    }

    private static DuplicateQuestionsResponse preview() {
        return new DuplicateQuestionsResponse(
                List.of(new DuplicateQuestionsResponse.DuplicateQuestionGroup(
                        1L, "MIR", "¿Qué es la mitosis?", 10L, "Es la única con explicación.",
                        List.of(new DuplicateQuestionsResponse.DuplicateCandidate(
                                11L, "Biología", "Tema 1", false, 4, true, false, true)))),
                1, 1, false,
                List.of(new DuplicateQuestionsResponse.SimilarTextGroup(
                        1L, "MIR", "Otro enunciado repetido", List.of(20L, 21L))));
    }

    @Test
    @DisplayName("sin banco seleccionado pide elegir uno")
    void asksForBankWhenMissing() {
        HttpResponse<String> response = client.exchange(
                WebTestSupport.get("/questions/duplicates", cookie), String.class);

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        assertThat(response.body()).contains("Elige un banco");
    }

    @Test
    @DisplayName("la vista previa muestra los grupos y los enunciados parecidos")
    void showsPreview() {
        when(apiClient.findDuplicateQuestions("MIR")).thenReturn(preview());

        HttpResponse<String> response = client.exchange(
                WebTestSupport.get("/questions/duplicates?examType=MIR", cookie), String.class);

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        assertThat(response.body()).contains("¿Qué es la mitosis?");
        assertThat(response.body()).contains("#10");
        assertThat(response.body()).contains("#11");
        assertThat(response.body()).contains("Mismo enunciado pero con opciones distintas");
        assertThat(response.body()).contains("data-total-duplicates=\"1\"");
    }

    @Test
    @DisplayName("un banco sin duplicados lo indica")
    void reportsNoDuplicates() {
        when(apiClient.findDuplicateQuestions("MIR")).thenReturn(
                new DuplicateQuestionsResponse(List.of(), 0, 0, false, List.of()));

        HttpResponse<String> response = client.exchange(
                WebTestSupport.get("/questions/duplicates?examType=MIR", cookie), String.class);

        assertThat(response.body()).contains("No hay preguntas duplicadas en este banco");
    }

    @Test
    @DisplayName("el lote de limpieza devuelve los contadores en JSON")
    void purgeBatchReturnsCounters() {
        when(apiClient.purgeDuplicateQuestions(any(DuplicatePurgeRequest.class)))
                .thenReturn(new DuplicatePurgeResponse(1, 1, 1, 0, 0, 0, 0, 2, 3, List.of("nota")));

        HttpResponse<String> response = client.exchange(
                WebTestSupport.postJsonForm("/questions/duplicates/purge/batch", cookie, "examType=MIR"),
                String.class);

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        assertThat(response.body()).contains("\"deleted\":1");
        assertThat(response.body()).contains("\"remaining\":3");
        ArgumentCaptor<DuplicatePurgeRequest> captor = ArgumentCaptor.forClass(DuplicatePurgeRequest.class);
        verify(apiClient).purgeDuplicateQuestions(captor.capture());
        assertThat(captor.getValue().examType()).isEqualTo("MIR");
    }

    @Test
    @DisplayName("la limpieza sin JavaScript repite pasadas hasta que no quedan grupos")
    void purgeWithoutJavascriptRepeatsUntilDone() {
        when(apiClient.purgeDuplicateQuestions(any(DuplicatePurgeRequest.class)))
                .thenReturn(new DuplicatePurgeResponse(1, 1, 0, 0, 0, 0, 0, 0, 2, List.of()))
                .thenReturn(new DuplicatePurgeResponse(1, 2, 0, 0, 0, 0, 0, 0, 0, List.of()));
        when(apiClient.findDuplicateQuestions("MIR")).thenReturn(
                new DuplicateQuestionsResponse(List.of(), 0, 0, false, List.of()));

        HttpResponse<String> response = client.exchange(
                WebTestSupport.postForm("/questions/duplicates/purge", cookie, "examType=MIR"),
                String.class);

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        assertThat(response.body()).contains("Limpieza terminada");
        assertThat(response.body()).contains("3");
        verify(apiClient, times(2)).purgeDuplicateQuestions(any(DuplicatePurgeRequest.class));
    }

    @Test
    @DisplayName("no se puede limpiar sin indicar banco")
    void purgeRequiresBank() {
        HttpResponse<String> response = client.exchange(
                WebTestSupport.postForm("/questions/duplicates/purge", cookie, ""),
                String.class);

        assertThat(response.body()).contains("Elige un banco");
        verify(apiClient, times(0)).purgeDuplicateQuestions(any());
    }

    @Test
    @DisplayName("un CREATOR también accede a la limpieza de duplicadas")
    void creatorCanAccess() {
        when(apiClient.login(any())).thenReturn(new bir.app.web.dto.LoginResponse(
                "jwt", "bearer", 3600, "demo", List.of("ROLE_CREATOR")));
        when(apiClient.findDuplicateQuestions("MIR")).thenReturn(preview());
        String creatorCookie = WebTestSupport.login(client);

        HttpResponse<String> response = client.exchange(
                WebTestSupport.get("/questions/duplicates?examType=MIR", creatorCookie), String.class);

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        assertThat(response.body()).contains("Preguntas duplicadas");
    }

    @Test
    @DisplayName("un USER no puede entrar (le redirige al login)")
    void userIsRejected() {
        when(apiClient.login(any())).thenReturn(new bir.app.web.dto.LoginResponse(
                "jwt", "bearer", 3600, "user", List.of("ROLE_USER")));
        String userCookie = WebTestSupport.login(client);

        HttpResponse<?> response = client.exchange(
                WebTestSupport.get("/questions/duplicates?examType=MIR", userCookie), String.class);

        assertThat(response.getStatus().getCode()).isEqualTo(303);
    }

    @Test
    @DisplayName("si la API falla al buscar, se muestra el error")
    void showsErrorWhenApiFails() {
        when(apiClient.findDuplicateQuestions(eq("MIR")))
                .thenThrow(new IllegalStateException("boom"));

        HttpResponse<String> response = client.exchange(
                WebTestSupport.get("/questions/duplicates?examType=MIR", cookie), String.class);

        assertThat(response.body()).contains("No se pudieron buscar los duplicados");
        assertThat(response.body()).contains("boom");
    }
}
