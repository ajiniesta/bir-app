package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Produces;
import io.micronaut.scheduling.TaskExecutors;
import io.micronaut.scheduling.annotation.ExecuteOn;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.security.utils.SecurityService;
import io.micronaut.views.ModelAndView;

import java.util.HashMap;
import java.util.Map;

/**
 * Landing pública y, si hay sesión iniciada, dashboard de entrada con las
 * estadísticas del usuario y el resumen global.
 */
@Controller
@Produces(MediaType.TEXT_HTML)
@ExecuteOn(TaskExecutors.BLOCKING)
public class HomeWebController {

    private final QuestionApiClient client;
    private final SecurityService securityService;

    public HomeWebController(QuestionApiClient client, SecurityService securityService) {
        this.client = client;
        this.securityService = securityService;
    }

    @Get("/")
    @Secured(SecurityRule.IS_ANONYMOUS)
    public ModelAndView<Map<String, Object>> index() {
        Map<String, Object> model = new HashMap<>();

        boolean authenticated = securityService.isAuthenticated();
        model.put("authenticated", authenticated);
        model.put("isAdmin", securityService.hasRole("ROLE_ADMIN"));
        model.put("isCreator", securityService.hasRole("ROLE_CREATOR"));
        securityService.getAuthentication().ifPresent(authentication -> {
            model.put("username", authentication.getName());
            Object displayName = authentication.getAttributes().get("displayName");
            model.put("displayName", displayName != null ? displayName : authentication.getName());
        });

        if (authenticated) {
            try {
                model.put("stats", client.bankStats());
            } catch (Exception e) {
                model.put("error", "No se pudieron obtener las estadísticas del banco de preguntas: " + e.getMessage());
            }

            try {
                model.put("quizStats", client.quizStats());
            } catch (Exception e) {
                model.put("statsError", "No se pudieron obtener tus estadísticas: " + e.getMessage());
            }
        }
        return new ModelAndView<>("index", model);
    }
}
