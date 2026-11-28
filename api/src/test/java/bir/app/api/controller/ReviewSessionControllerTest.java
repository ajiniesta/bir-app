package bir.app.api.controller;

import bir.app.api.dto.AnswerRequest;
import bir.app.api.dto.CreateReviewSessionRequest;
import bir.app.api.dto.ReviewFiltersResponse;
import bir.app.api.dto.ReviewSessionResponse;
import bir.app.api.dto.ReviewSessionSummaryResponse;
import bir.app.api.service.ReviewSessionService;
import io.micronaut.security.authentication.Authentication;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReviewSessionController")
class ReviewSessionControllerTest {

    @Mock
    ReviewSessionService reviewSessionService;

    @InjectMocks
    ReviewSessionController reviewSessionController;

    private static Authentication auth(String username) {
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn(username);
        return authentication;
    }

    private static ReviewSessionResponse sampleResponse(boolean finished) {
        return new ReviewSessionResponse(
                10L,
                "BIR",
                "Biólogo Interno Residente",
                List.of("Microbiología"),
                List.of("bacterias"),
                5,
                1,
                1,
                100d,
                !finished,
                finished,
                List.of(),
                List.of());
    }

    @Test
    @DisplayName("filters delega en ReviewSessionService con el usuario autenticado y examType")
    void filtersDelegatesToService() {
        Authentication authentication = auth("demo");
        ReviewFiltersResponse expected = new ReviewFiltersResponse(
                List.of("Anatomía", "Fisiología"),
                List.of("tema1", "tema2"));
        when(reviewSessionService.filters("demo", "MIR")).thenReturn(expected);

        ReviewFiltersResponse result = reviewSessionController.filters(authentication, "MIR");

        assertThat(result).isEqualTo(expected);
        verify(reviewSessionService).filters("demo", "MIR");
    }

    @Test
    @DisplayName("listActive delega en ReviewSessionService con el usuario autenticado")
    void listActiveDelegatesToService() {
        Authentication authentication = auth("demo");
        ReviewSessionSummaryResponse summary = new ReviewSessionSummaryResponse(
                10L,
                "BIR",
                "Biólogo Interno Residente",
                List.of("Microbiología"),
                List.of("bacterias"),
                3,
                2,
                10,
                LocalDateTime.now(),
                false);
        when(reviewSessionService.listActive("demo")).thenReturn(List.of(summary));

        List<ReviewSessionSummaryResponse> result = reviewSessionController.listActive(authentication);

        assertThat(result).containsExactly(summary);
        verify(reviewSessionService).listActive("demo");
    }

    @Test
    @DisplayName("create delega en ReviewSessionService con el usuario autenticado y la petición")
    void createDelegatesToService() {
        Authentication authentication = auth("demo");
        CreateReviewSessionRequest request = new CreateReviewSessionRequest(
                "BIR",
                List.of("Microbiología"),
                List.of("bacterias"));
        ReviewSessionResponse expected = sampleResponse(false);
        when(reviewSessionService.create("demo", request)).thenReturn(expected);

        ReviewSessionResponse result = reviewSessionController.create(authentication, request);

        assertThat(result).isEqualTo(expected);
        verify(reviewSessionService).create("demo", request);
    }

    @Test
    @DisplayName("get delega en ReviewSessionService con el usuario autenticado y el id")
    void getDelegatesToService() {
        Authentication authentication = auth("demo");
        ReviewSessionResponse expected = sampleResponse(false);
        when(reviewSessionService.get("demo", 10L)).thenReturn(expected);

        ReviewSessionResponse result = reviewSessionController.get(authentication, 10L);

        assertThat(result).isEqualTo(expected);
        verify(reviewSessionService).get("demo", 10L);
    }

    @Test
    @DisplayName("answer delega en ReviewSessionService con el usuario autenticado, el id y AnswerRequest")
    void answerDelegatesToService() {
        Authentication authentication = auth("demo");
        AnswerRequest request = new AnswerRequest(1, "A");
        ReviewSessionResponse expected = sampleResponse(false);
        when(reviewSessionService.answer("demo", 10L, request)).thenReturn(expected);

        ReviewSessionResponse result = reviewSessionController.answer(authentication, 10L, request);

        assertThat(result).isEqualTo(expected);
        verify(reviewSessionService).answer("demo", 10L, request);
    }

    @Test
    @DisplayName("finish delega en ReviewSessionService con el usuario autenticado y el id")
    void finishDelegatesToService() {
        Authentication authentication = auth("demo");
        ReviewSessionResponse expected = sampleResponse(true);
        when(reviewSessionService.finish("demo", 10L)).thenReturn(expected);

        ReviewSessionResponse result = reviewSessionController.finish(authentication, 10L);

        assertThat(result).isEqualTo(expected);
        assertThat(result.finished()).isTrue();
        verify(reviewSessionService).finish("demo", 10L);
    }
}
