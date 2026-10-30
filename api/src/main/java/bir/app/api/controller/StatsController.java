package bir.app.api.controller;

import bir.app.api.dto.DashboardStatsResponse;
import bir.app.api.dto.MockExamStatsResponse;
import bir.app.api.dto.QuizStatsResponse;
import bir.app.api.dto.StatsOverviewResponse;
import bir.app.api.service.FreeSessionService;
import bir.app.api.service.MockExamAttemptService;
import bir.app.api.service.QuestionService;
import bir.app.api.service.StatisticsService;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.rules.SecurityRule;

@Controller("/api/stats")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class StatsController {

    private final QuestionService questionService;
    private final FreeSessionService freeSessionService;
    private final MockExamAttemptService mockExamAttemptService;
    private final StatisticsService statisticsService;

    public StatsController(QuestionService questionService,
                           FreeSessionService freeSessionService,
                           MockExamAttemptService mockExamAttemptService,
                           StatisticsService statisticsService) {
        this.questionService = questionService;
        this.freeSessionService = freeSessionService;
        this.mockExamAttemptService = mockExamAttemptService;
        this.statisticsService = statisticsService;
    }

    /** Contadores del banco de preguntas: públicos (los usa la landing). */
    @Get
    @Secured(SecurityRule.IS_ANONYMOUS)
    public DashboardStatsResponse stats() {
        return questionService.dashboardStats();
    }

    /** Contadores de los bancos visibles para el usuario autenticado. */
    @Get("/banks")
    public DashboardStatsResponse banks(Authentication authentication) {
        return questionService.dashboardStatsFor(authentication.getName());
    }

    /** Estadísticas del modo libre: las del usuario autenticado y el global. */
    @Get("/quiz")
    public QuizStatsResponse quizStats(Authentication authentication) {
        return freeSessionService.stats(authentication.getName());
    }

    /**
     * Estadísticas combinadas (modo libre + simulacros entregados) por categoría.
     * El bloque global solo viene informado para ADMIN/CREATOR.
     */
    @Get("/overview")
    public StatsOverviewResponse overview(Authentication authentication) {
        return statisticsService.overview(authentication.getName());
    }

    /** Estadísticas de simulacros del usuario autenticado. */
    @Get("/mock-exams")
    public MockExamStatsResponse mockExamStats(Authentication authentication) {
        return mockExamAttemptService.stats(authentication.getName());
    }
}
