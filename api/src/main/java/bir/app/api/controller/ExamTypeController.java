package bir.app.api.controller;

import bir.app.api.dto.ExamTypeResponse;
import bir.app.api.service.ExamTypeService;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;

import java.util.List;

@Controller("/api/exam-types")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class ExamTypeController {

    private final ExamTypeService examTypeService;

    public ExamTypeController(ExamTypeService examTypeService) {
        this.examTypeService = examTypeService;
    }

    @Get
    public List<ExamTypeResponse> list() {
        return examTypeService.findAll();
    }
}
