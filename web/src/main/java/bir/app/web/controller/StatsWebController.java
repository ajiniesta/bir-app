package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.support.NavService;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Produces;
import io.micronaut.scheduling.TaskExecutors;
import io.micronaut.scheduling.annotation.ExecuteOn;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.views.ModelAndView;

import java.util.HashMap;
import java.util.Map;

/**
 * Página de estadísticas: progreso personal por categoría (modo libre +
 * simulacros entregados) y, para ADMIN/CREATOR, el resumen global de todos los
 * usuarios.
 */
@Controller("/estadisticas")
@Secured(SecurityRule.IS_AUTHENTICATED)
@Produces(MediaType.TEXT_HTML)
@ExecuteOn(TaskExecutors.BLOCKING)
public class StatsWebController {

    private final QuestionApiClient client;
    private final NavService navService;

    public StatsWebController(QuestionApiClient client, NavService navService) {
        this.client = client;
        this.navService = navService;
    }

    @Get
    public ModelAndView<Map<String, Object>> overview() {
        Map<String, Object> model = new HashMap<>();
        try {
            model.put("overview", client.statsOverview());
        } catch (Exception e) {
            model.put("error", "No se pudieron cargar las estadísticas: " + rootMessage(e));
        }
        return new ModelAndView<>("stats/index", navService.addTo(model));
    }

    private static String rootMessage(Throwable e) {
        Throwable cause = e;
        while (cause.getCause() != null && cause.getCause() != cause) {
            cause = cause.getCause();
        }
        return cause.getMessage() == null ? "error inesperado" : cause.getMessage();
    }
}
