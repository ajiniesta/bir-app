package bir.app.api.controller;

import bir.app.api.dto.QuestionStatsResponse;
import bir.app.api.service.FreeSessionService;
import bir.app.api.service.MockExamAttemptService;
import bir.app.api.service.QuestionService;
import bir.app.api.service.StatisticsService;
import io.micronaut.security.authentication.Authentication;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("StatsController")
class StatsControllerTest {

    @Mock
    QuestionService questionService;
    @Mock
    FreeSessionService freeSessionService;
    @Mock
    MockExamAttemptService mockExamAttemptService;
    @Mock
    StatisticsService statisticsService;

    @InjectMocks
    StatsController statsController;

    @Test
    @DisplayName("questionStats devuelve las estadísticas de plataforma y del usuario autenticado para una pregunta")
    void questionStatsDelegatesToStatisticsService() {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("demo");

        QuestionStatsResponse expected = new QuestionStatsResponse(
                42L,
                new QuestionStatsResponse.ScopeStats(120L, 90L, 30L, 75.0d),
                new QuestionStatsResponse.ScopeStats(4L, 3L, 1L, 75.0d)
        );
        when(statisticsService.questionStats(42L, "demo")).thenReturn(expected);

        QuestionStatsResponse result = statsController.questionStats(42L, auth);

        assertThat(result).isEqualTo(expected);
        verify(statisticsService).questionStats(42L, "demo");
    }
}
