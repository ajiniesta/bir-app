package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.CreateQuestionRequest;
import bir.app.web.dto.ExamTypeResponse;
import bir.app.web.dto.ProposalCountResponse;
import bir.app.web.dto.QuestionImportRequest;
import bir.app.web.dto.QuestionImportResponse;
import bir.app.web.dto.QuestionPageResponse;
import bir.app.web.dto.QuestionResponse;
import bir.app.web.support.WebTestSupport;
import io.micronaut.http.HttpHeaders;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.BlockingHttpClient;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.http.client.multipart.MultipartBody;
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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@MicronautTest
@DisplayName("QuestionWebController (HTTP)")
class QuestionWebControllerTest {

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

    @Test
    @DisplayName("el listado propaga los filtros de texto, banco y tag")
    void listPropagatesFilters() {
        when(apiClient.searchQuestions(1, 20, "corazon", "MIR", null, "Tema 1"))
                .thenReturn(new QuestionPageResponse(List.of(), 1, 20, 0, 0));
        when(apiClient.listExamTypes()).thenReturn(List.of(new ExamTypeResponse(1L, "MIR", "MIR")));
        when(apiClient.listCategories()).thenReturn(List.of("Anatomía"));
        when(apiClient.listTags()).thenReturn(List.of("Tema 1"));

        HttpResponse<String> response = client.exchange(
                WebTestSupport.get("/questions?q=corazon&examType=MIR&tag=Tema+1", cookie),
                String.class);

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        verify(apiClient).searchQuestions(1, 20, "corazon", "MIR", null, "Tema 1");
    }

    @Test
    @DisplayName("crear una pregunta envía el tag y la opción correcta a la API")
    void createQuestionSendsTagAndCorrectOption() {
        when(apiClient.createQuestion(any(CreateQuestionRequest.class)))
                .thenReturn(new QuestionResponse(1L, "Enunciado", "Anatomía", "Tema 1", "Explicación",
                        "MIR", "MIR", List.of(), null, null));
        String body = "text=Enunciado&category=Anatom%C3%ADa&tag=Tema+1&explanation=Explicaci%C3%B3n"
                + "&examTypeId=1&correctLetter=B"
                + "&answerOptions[0].letter=A&answerOptions[0].text=Opcion+A"
                + "&answerOptions[1].letter=B&answerOptions[1].text=Opcion+B";

        HttpResponse<?> response = client.exchange(
                WebTestSupport.postForm("/questions/create", cookie, body));

        assertThat(response.getStatus().getCode()).isEqualTo(303);
        assertThat(response.getHeaders().get(HttpHeaders.LOCATION)).isEqualTo("/questions");

        ArgumentCaptor<CreateQuestionRequest> captor = ArgumentCaptor.forClass(CreateQuestionRequest.class);
        verify(apiClient).createQuestion(captor.capture());
        assertThat(captor.getValue().tag()).isEqualTo("Tema 1");
        assertThat(captor.getValue().category()).isEqualTo("Anatomía");
        assertThat(captor.getValue().answerOptions()).hasSize(2);
        assertThat(captor.getValue().answerOptions())
                .filteredOn(CreateQuestionRequest.AnswerOptionRequest::isCorrect)
                .extracting(CreateQuestionRequest.AnswerOptionRequest::letter)
                .containsExactly("B");
    }

    @Test
    @DisplayName("si la API rechaza la pregunta, repuebla el formulario con el error")
    void createInvalidQuestionShowsError() {
        when(apiClient.createQuestion(any(CreateQuestionRequest.class)))
                .thenThrow(new IllegalArgumentException("Exactly one answer must be correct, but found 0"));
        when(apiClient.listExamTypes()).thenReturn(List.of(new ExamTypeResponse(1L, "MIR", "MIR")));
        when(apiClient.listTags()).thenReturn(List.of("Tema 1"));
        String body = "text=Enunciado&examTypeId=1&correctLetter=A"
                + "&answerOptions[0].letter=A&answerOptions[0].text=Opcion+A";

        HttpResponse<String> response = client.exchange(
                WebTestSupport.postForm("/questions/create", cookie, body), String.class);

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        assertThat(response.body()).contains("Failed to create question");
        assertThat(response.body()).contains("Exactly one answer must be correct");
    }

    // --- Importación por lotes -------------------------------------------------

    /** Respuesta de la API proporcional al número de objetos del lote. */
    private void stubImportCountingQuestions() {
        when(apiClient.importQuestions(any(QuestionImportRequest.class))).thenAnswer(invocation -> {
            String content = invocation.getArgument(0, QuestionImportRequest.class).content();
            int count = content.split("\n").length;
            return new QuestionImportResponse(count, count, 0, 0, List.of());
        });
    }

    /** Construye {@code count} objetos JSON de pregunta, uno por línea. */
    private static String importFile(int count) {
        StringBuilder content = new StringBuilder();
        for (int i = 1; i <= count; i++) {
            content.append("""
                    {"exam_type":"MIR","text":"Pregunta %d","answers":[\
                    {"letter":"A","text":"A","is_correct":true}]}
                    """.formatted(i));
        }
        return content.toString();
    }

    private HttpResponse<String> uploadImport(String content) {
        MultipartBody body = MultipartBody.builder()
                .addPart("file", "preguntas.json", MediaType.APPLICATION_JSON_TYPE,
                        content.getBytes(StandardCharsets.UTF_8))
                .build();
        return client.exchange(io.micronaut.http.HttpRequest
                .POST("/questions/import", body)
                .contentType(MediaType.MULTIPART_FORM_DATA_TYPE)
                .header(HttpHeaders.COOKIE, cookie)
                .accept(MediaType.TEXT_HTML), String.class);
    }

    private static String importId(String html) {
        Matcher matcher = Pattern.compile("data-import-id=\"([^\"]+)\"").matcher(html);
        assertThat(matcher.find())
                .withFailMessage("La vista de importación no incluye data-import-id: %s", html)
                .isTrue();
        return matcher.group(1);
    }

    @Test
    @DisplayName("subir el fichero solo lo trocea: la API todavía no recibe nada")
    void uploadOnlySplitsTheFile() {
        HttpResponse<String> response = uploadImport(importFile(250));

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        assertThat(response.body()).contains("data-total-batches=\"3\"");
        assertThat(response.body()).contains("250");
        verify(apiClient, times(0)).importQuestions(any(QuestionImportRequest.class));
    }

    @Test
    @DisplayName("cada lote se procesa en una petición independiente")
    void processesOneBatchPerRequest() {
        stubImportCountingQuestions();
        String id = importId(uploadImport(importFile(250)).body());

        for (int index = 0; index < 3; index++) {
            HttpResponse<String> response = client.exchange(
                    WebTestSupport.postJsonForm("/questions/import/batch", cookie,
                            "importId=" + id + "&index=" + index),
                    String.class);

            assertThat(response.getStatus().getCode()).isEqualTo(200);
            assertThat(response.body()).contains("\"index\":" + index);
            assertThat(response.body()).contains("\"totalBatches\":3");
        }

        verify(apiClient, times(3)).importQuestions(any(QuestionImportRequest.class));
        HttpClientResponseException outOfRange = catchThrowableOfType(
                () -> client.exchange(WebTestSupport.postJsonForm("/questions/import/batch", cookie,
                                "importId=" + id + "&index=3"), String.class),
                HttpClientResponseException.class);
        assertThat(outOfRange.getStatus().getCode()).isEqualTo(400);
    }

    @Test
    @DisplayName("el lote devuelve importadas, duplicadas y errores")
    void batchReturnsCounters() {
        when(apiClient.importQuestions(any(QuestionImportRequest.class)))
                .thenReturn(new QuestionImportResponse(2, 1, 0, 1, List.of("Pregunta 2: fallo")));
        String id = importId(uploadImport(importFile(2)).body());

        HttpResponse<String> response = client.exchange(
                WebTestSupport.postJsonForm("/questions/import/batch", cookie, "importId=" + id + "&index=0"),
                String.class);

        assertThat(response.body()).contains("\"imported\":1");
        assertThat(response.body()).contains("\"duplicates\":1");
        assertThat(response.body()).contains("Pregunta 2: fallo");
    }

    @Test
    @DisplayName("el respaldo sin JavaScript procesa todos los lotes y suma el resumen")
    void importAllAggregatesEveryBatch() {
        stubImportCountingQuestions();
        String id = importId(uploadImport(importFile(250)).body());

        HttpResponse<String> response = client.exchange(
                WebTestSupport.postForm("/questions/import/all", cookie, "importId=" + id),
                String.class);

        assertThat(response.getStatus().getCode()).isEqualTo(200);
        assertThat(response.body()).contains("importado");
        assertThat(response.body()).contains("250");
        verify(apiClient, times(3)).importQuestions(any(QuestionImportRequest.class));
    }

    @Test
    @DisplayName("un lote de una importación caducada devuelve 400")
    void batchWithUnknownImportIdFails() {
        HttpClientResponseException error = catchThrowableOfType(
                () -> client.exchange(WebTestSupport.postJsonForm("/questions/import/batch", cookie,
                        "importId=otro&index=0"), String.class),
                HttpClientResponseException.class);

        assertThat(error.getStatus().getCode()).isEqualTo(400);
        assertThat(error.getResponse().getBody(String.class)).hasValueSatisfying(
                body -> assertThat(body).contains("caducado"));
    }

    @Test
    @DisplayName("si la API falla en un lote se informa del error")
    void batchApiFailureIsReported() {
        when(apiClient.importQuestions(any(QuestionImportRequest.class)))
                .thenThrow(new IllegalStateException("Read Timeout"));
        String id = importId(uploadImport(importFile(1)).body());

        HttpClientResponseException error = catchThrowableOfType(
                () -> client.exchange(WebTestSupport.postJsonForm("/questions/import/batch", cookie,
                        "importId=" + id + "&index=0"), String.class),
                HttpClientResponseException.class);

        assertThat(error.getStatus().getCode()).isEqualTo(500);
        assertThat(error.getResponse().getBody(String.class)).hasValueSatisfying(
                body -> assertThat(body).contains("Read Timeout"));
    }
}
