package bir.app.api.controller;

import bir.app.api.service.QuestionService;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;

import java.util.List;

/**
 * Tags distintos del banco de preguntas. Está abierto a cualquier usuario
 * autenticado (no solo ADMIN/CREATOR) porque el modo libre también permite
 * filtrar por tag.
 */
@Controller("/api/tags")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class TagController {

    private final QuestionService questionService;

    public TagController(QuestionService questionService) {
        this.questionService = questionService;
    }

    @Get
    public List<String> list() {
        return questionService.listTags();
    }
}
