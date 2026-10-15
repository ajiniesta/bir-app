package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.scheduling.TaskExecutors;
import io.micronaut.scheduling.annotation.ExecuteOn;
import io.micronaut.views.ModelAndView;

import java.util.HashMap;
import java.util.Map;

/**
 * Landing page: dashboard con el número de preguntas por tipo de examen.
 */
@Controller
@ExecuteOn(TaskExecutors.BLOCKING)
public class HomeWebController {

    private final QuestionApiClient client;

    public HomeWebController(QuestionApiClient client) {
        this.client = client;
    }

    @Get("/")
    public ModelAndView<Map<String, Object>> index() {
        Map<String, Object> model = new HashMap<>();
        try {
            model.put("stats", client.stats());
        } catch (Exception e) {
            model.put("error", "No se pudo obtener las estadísticas: " + e.getMessage());
        }
        return new ModelAndView<>("index", model);
    }
}
