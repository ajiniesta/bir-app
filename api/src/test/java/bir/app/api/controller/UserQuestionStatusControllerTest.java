package bir.app.api.controller;

import bir.app.api.dto.MessageResponse;
import bir.app.api.dto.QuestionPageResponse;
import bir.app.api.dto.QuestionResponse;
import bir.app.api.dto.QuestionSummaryResponse;
import bir.app.api.service.UserQuestionStatusService;
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
@DisplayName("UserQuestionStatusController")
class UserQuestionStatusControllerTest {

    @Mock
    UserQuestionStatusService userQuestionStatusService;

    @InjectMocks
    UserQuestionStatusController controller;

    private static Authentication auth(String username) {
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn(username);
        return authentication;
    }

    @Test
    @DisplayName("listDoubts delega en UserQuestionStatusService con el usuario autenticado y los filtros de paginación incluyendo status")
    void listDoubtsDelegatesToService() {
        Authentication authentication = auth("demo");
        QuestionSummaryResponse summary = new QuestionSummaryResponse(
                10L, "¿Pregunta en duda?", "Cardiología", "ecg", List.of("ecg"), "MIR", "FAILED");
        QuestionPageResponse expected = new QuestionPageResponse(List.of(summary), 1, 20, 1, 1);

        when(userQuestionStatusService.searchDoubtQuestions("demo", 1, 20, "duda", "MIR", "Cardiología", "ecg", "FAILED"))
                .thenReturn(expected);

        QuestionPageResponse result = controller.listDoubts(
                authentication, 1, 20, "duda", "MIR", "Cardiología", "ecg", "FAILED");

        assertThat(result).isEqualTo(expected);
        verify(userQuestionStatusService)
                .searchDoubtQuestions("demo", 1, 20, "duda", "MIR", "Cardiología", "ecg", "FAILED");
    }

    @Test
    @DisplayName("getDoubtQuestionDetail delega en UserQuestionStatusService con el usuario autenticado y el id")
    void getDoubtQuestionDetailDelegatesToService() {
        Authentication authentication = auth("demo");
        QuestionResponse expected = new QuestionResponse(
                10L,
                "¿Pregunta en duda?",
                "Cardiología",
                "ecg",
                List.of("ecg"),
                "Explicación detallada",
                "MIR",
                "Médico Interno Residente",
                List.of(new QuestionResponse.AnswerOptionResponse(1L, "A", "Opción A", true)),
                LocalDateTime.now(),
                LocalDateTime.now());

        when(userQuestionStatusService.getDoubtQuestionDetail("demo", 10L)).thenReturn(expected);

        QuestionResponse result = controller.getDoubtDetail(authentication, 10L);

        assertThat(result).isEqualTo(expected);
        verify(userQuestionStatusService).getDoubtQuestionDetail("demo", 10L);
    }

    @Test
    @DisplayName("markAsDoubt delega en UserQuestionStatusService con el usuario autenticado y el id de la pregunta")
    void markAsDoubtDelegatesToService() {
        Authentication authentication = auth("demo");

        MessageResponse response = controller.markAsDoubt(authentication, 10L);

        assertThat(response.message()).contains("en duda");
        verify(userQuestionStatusService).markAsDoubt("demo", 10L);
    }
}
