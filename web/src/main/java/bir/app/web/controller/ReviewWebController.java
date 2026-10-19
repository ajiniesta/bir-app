package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.ExamTypeResponse;
import bir.app.web.dto.ReviewForm;
import bir.app.web.dto.ReviewProposalRequest;
import bir.app.web.support.NavService;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.micronaut.scheduling.TaskExecutors;
import io.micronaut.scheduling.annotation.ExecuteOn;
import io.micronaut.security.annotation.Secured;
import io.micronaut.views.ModelAndView;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Modo revisión de respuestas: bandeja para que ADMIN/CREATOR evalúen las
 * propuestas de respuesta alternativa (aceptar/rechazar con nota) y, de forma
 * independiente, las apliquen a la pregunta.
 */
@Controller("/revisiones")
@Secured({"ROLE_ADMIN", "ROLE_CREATOR"})
@Produces(MediaType.TEXT_HTML)
@ExecuteOn(TaskExecutors.BLOCKING)
public class ReviewWebController {

    private final QuestionApiClient client;
    private final NavService navService;

    public ReviewWebController(QuestionApiClient client, NavService navService) {
        this.client = client;
        this.navService = navService;
    }

    @Get
    public ModelAndView<Map<String, Object>> list(@QueryValue Optional<String> status,
                                                  @QueryValue Optional<String> examType,
                                                  @QueryValue Optional<String> saved,
                                                  @QueryValue Optional<String> error) {
        String statusFilter = status.filter(s -> !s.isBlank()).orElse("PENDING");
        Map<String, Object> model = new HashMap<>();
        model.put("status", statusFilter);
        model.put("examType", examType.orElse(""));
        model.put("saved", saved.isPresent());
        model.put("error", error.orElse(null));
        model.put("examTypes", safeExamTypes());
        try {
            model.put("proposals",
                    client.listAnswerProposals(statusFilter, examType.orElse(null)));
        } catch (Exception e) {
            model.put("proposals", List.of());
            model.put("error", "No se pudieron cargar las propuestas: " + rootMessage(e));
        }
        return new ModelAndView<>("review/list", navService.addTo(model));
    }

    @Post("/{id}/review")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public HttpResponse<?> review(Long id, @Body ReviewForm form) {
        String status = form.status() == null ? "" : form.status().trim().toUpperCase();
        try {
            client.reviewAnswerProposal(id, new ReviewProposalRequest(status, form.note()));
            return HttpResponse.seeOther(URI.create("/revisiones?status=" + status + "&saved=1"));
        } catch (Exception e) {
            return HttpResponse.seeOther(URI.create("/revisiones?status=" + status
                    + "&error=" + URLEncoder.encode(rootMessage(e), StandardCharsets.UTF_8)));
        }
    }

    private List<ExamTypeResponse> safeExamTypes() {
        try {
            return client.listExamTypes();
        } catch (Exception e) {
            return List.of();
        }
    }

    private static String rootMessage(Throwable e) {
        Throwable cause = e;
        while (cause.getCause() != null && cause.getCause() != cause) {
            cause = cause.getCause();
        }
        return cause.getMessage() == null ? "error inesperado" : cause.getMessage();
    }
}
