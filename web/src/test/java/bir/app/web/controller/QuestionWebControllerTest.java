package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.CreateQuestionRequest;
import bir.app.web.dto.ExamTypeResponse;
import bir.app.web.dto.ProposalCountResponse;
import bir.app.web.dto.QuestionPageResponse;
import bir.app.web.dto.QuestionResponse;
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
}
