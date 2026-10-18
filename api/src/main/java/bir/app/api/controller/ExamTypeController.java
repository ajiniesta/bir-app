package bir.app.api.controller;

import bir.app.api.dto.ExamTypeResponse;
import bir.app.api.service.ExamTypeService;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.rules.SecurityRule;

import java.util.List;

@Controller("/api/exam-types")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class ExamTypeController {

    private final ExamTypeService examTypeService;

    public ExamTypeController(ExamTypeService examTypeService) {
        this.examTypeService = examTypeService;
    }

    /** Para un usuario normal solo devuelve los bancos que tiene asignados. */
    @Get
    public List<ExamTypeResponse> list(Authentication authentication) {
        return examTypeService.findAllFor(authentication.getName());
    }
}
