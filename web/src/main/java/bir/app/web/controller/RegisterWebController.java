package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.RegisterRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.micronaut.scheduling.TaskExecutors;
import io.micronaut.scheduling.annotation.ExecuteOn;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.views.ModelAndView;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

@Controller
@Produces(MediaType.TEXT_HTML)
@ExecuteOn(TaskExecutors.BLOCKING)
public class RegisterWebController {

    private final QuestionApiClient client;

    public RegisterWebController(QuestionApiClient client) {
        this.client = client;
    }

    @Get("/register")
    @Secured(SecurityRule.IS_ANONYMOUS)
    public ModelAndView<Map<String, Object>> form() {
        return new ModelAndView<>("register", new HashMap<>());
    }

    @Post("/register")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Secured(SecurityRule.IS_ANONYMOUS)
    public HttpResponse<?> submit(@Body RegisterRequest request) {
        try {
            client.register(request);
            return HttpResponse.seeOther(URI.create("/login?registered"));
        } catch (Exception e) {
            Map<String, Object> model = new HashMap<>();
            model.put("error", "No se pudo crear la cuenta: " + rootMessage(e));
            model.put("username", request.username());
            model.put("displayName", request.displayName());
            return HttpResponse.ok(new ModelAndView<>("register", model));
        }
    }

    private String rootMessage(Throwable e) {
        Throwable cause = e;
        while (cause.getCause() != null && cause.getCause() != cause) {
            cause = cause.getCause();
        }
        return cause.getMessage() == null ? "error inesperado" : cause.getMessage();
    }
}
