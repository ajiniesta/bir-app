package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.AnswerRequest;
import bir.app.web.dto.CreateAnswerProposalRequest;
import bir.app.web.dto.CreateFreeSessionRequest;
import bir.app.web.dto.ExamTypeResponse;
import bir.app.web.dto.FreeSessionResponse;
import bir.app.web.dto.MyProposalResponse;
import bir.app.web.dto.ProposalForm;
import bir.app.web.support.NavService;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.micronaut.scheduling.TaskExecutors;
import io.micronaut.scheduling.annotation.ExecuteOn;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.views.ModelAndView;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Modo libre: configurar la partida, responder pregunta a pregunta con feedback
 * inmediato y ver el resultado final.
 */
@Controller("/free")
@Secured(SecurityRule.IS_AUTHENTICATED)
@Produces(MediaType.TEXT_HTML)
@ExecuteOn(TaskExecutors.BLOCKING)
public class FreeSessionWebController {

    private final QuestionApiClient client;
    private final NavService navService;

    public FreeSessionWebController(QuestionApiClient client, NavService navService) {
        this.client = client;
        this.navService = navService;
    }

    @Get
    public ModelAndView<Map<String, Object>> config() {
        return new ModelAndView<>("free/config", navService.addTo(configModel(new HashMap<>())));
    }

    @Post
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public HttpResponse<?> start(@Body CreateFreeSessionRequest request) {
        try {
            FreeSessionResponse session = client.createFreeSession(request);
            return HttpResponse.seeOther(URI.create("/free/" + session.id()));
        } catch (Exception e) {
            Map<String, Object> model = configModel(new HashMap<>());
            model.put("error", "No se pudo iniciar la partida: " + e.getMessage());
            return HttpResponse.ok(new ModelAndView<>("free/config", navService.addTo(model)));
        }
    }

    @Get("/{id}")
    public HttpResponse<?> session(Long id,
                                   @QueryValue Optional<Integer> answered,
                                   @QueryValue Optional<String> proposed,
                                   @QueryValue Optional<String> proposalError) {
        FreeSessionResponse session = client.getFreeSession(id);

        if (answered.isEmpty() && session.finished()) {
            return HttpResponse.seeOther(URI.create("/free/" + id + "/result"));
        }

        FreeSessionResponse.Item feedback = answered
                .map(position -> itemAt(session, position))
                .orElse(null);
        Map<String, Object> model = new HashMap<>();
        model.put("session", session);
        model.put("feedback", feedback);
        model.put("current", firstUnanswered(session));
        model.put("myProposal", feedback == null ? null : myProposalFor(feedback.questionId()));
        model.put("proposed", proposed.isPresent());
        model.put("proposalError", proposalError.orElse(null));
        return HttpResponse.ok(new ModelAndView<>("free/question", navService.addTo(model)));
    }

    @Post("/{id}/answer")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public HttpResponse<?> answer(Long id, @Body AnswerRequest request) {
        try {
            client.answer(id, request);
        } catch (Exception e) {
            // Si algo falla, volvemos a la pregunta actual sin marcar feedback.
            return HttpResponse.seeOther(URI.create("/free/" + id));
        }
        return HttpResponse.seeOther(URI.create("/free/" + id + "?answered=" + request.position()));
    }

    /** Guarda una propuesta de respuesta alternativa desde el feedback del modo libre. */
    @Post("/{id}/proposals")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public HttpResponse<?> propose(Long id, @Body ProposalForm form) {
        String base = "/free/" + id + "?answered=" + form.position();
        try {
            client.proposeAnswer(new CreateAnswerProposalRequest(
                    form.questionId(), form.proposedLetter(), form.proposedText(), form.comment(),
                    "FREE_SESSION", id, form.position(), form.selectedLetter()));
            return HttpResponse.seeOther(URI.create(base + "&proposed=1"));
        } catch (Exception e) {
            return HttpResponse.seeOther(URI.create(base + "&proposalError="
                    + URLEncoder.encode(rootMessage(e), StandardCharsets.UTF_8)));
        }
    }

    @Get("/{id}/result")
    public ModelAndView<Map<String, Object>> result(Long id) {
        Map<String, Object> model = new HashMap<>();
        model.put("session", client.getFreeSession(id));
        return new ModelAndView<>("free/result", navService.addTo(model));
    }

    // --- helpers ------------------------------------------------------------

    private Map<String, Object> configModel(Map<String, Object> model) {
        model.put("examTypes", safeExamTypes());
        model.put("categories", safeCategories());
        model.put("tags", safeTags());
        return model;
    }

    private FreeSessionResponse.Item firstUnanswered(FreeSessionResponse session) {
        return session.items().stream()
                .filter(item -> !item.answered())
                .findFirst()
                .orElse(null);
    }

    private FreeSessionResponse.Item itemAt(FreeSessionResponse session, int position) {
        return session.items().stream()
                .filter(item -> item.position() == position)
                .findFirst()
                .orElse(null);
    }

    private List<ExamTypeResponse> safeExamTypes() {
        try {
            return client.listExamTypes();
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<String> safeCategories() {
        try {
            return client.listCategories();
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<String> safeTags() {
        try {
            return client.listTags();
        } catch (Exception e) {
            return List.of();
        }
    }

    private MyProposalResponse myProposalFor(Long questionId) {
        if (questionId == null) {
            return null;
        }
        try {
            return client.myProposals(List.of(questionId)).stream().findFirst().orElse(null);
        } catch (Exception e) {
            return null;
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
