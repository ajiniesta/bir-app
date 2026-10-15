package bir.app.api.controller;

import bir.app.api.dto.DashboardStatsResponse;
import bir.app.api.service.QuestionService;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;

@Controller("/api/stats")
public class StatsController {

    private final QuestionService questionService;

    public StatsController(QuestionService questionService) {
        this.questionService = questionService;
    }

    @Get
    public DashboardStatsResponse stats() {
        return questionService.dashboardStats();
    }
}
