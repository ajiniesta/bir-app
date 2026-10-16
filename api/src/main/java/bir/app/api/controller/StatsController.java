package bir.app.api.controller;

import bir.app.api.dto.DashboardStatsResponse;
import bir.app.api.dto.QuizStatsResponse;
import bir.app.api.service.FreeSessionService;
import bir.app.api.service.QuestionService;
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

    public StatsController(QuestionService questionService, FreeSessionService freeSessionService) {
        this.questionService = questionService;
        this.freeSessionService = freeSessionService;
    }

    /** Contadores del banco de preguntas: públicos (los usa la landing). */
    @Get
    @Secured(SecurityRule.IS_ANONYMOUS)
    public DashboardStatsResponse stats() {
        return questionService.dashboardStats();
    }

    /** Estadísticas del modo libre: las del usuario autenticado y el global. */
    @Get("/quiz")
    public QuizStatsResponse quizStats(Authentication authentication) {
        return freeSessionService.stats(authentication.getName());
    }
}
