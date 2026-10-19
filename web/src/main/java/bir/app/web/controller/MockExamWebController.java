package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.*;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.micronaut.scheduling.TaskExecutors;
import io.micronaut.scheduling.annotation.ExecuteOn;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.security.utils.SecurityService;
import io.micronaut.views.ModelAndView;

import java.net.URI;
import java.util.*;

/**
 * Simulacros: colecciones fijas de preguntas que el usuario resuelve sin
 * feedback hasta entregar, con historial de intentos.
 */
@Controller("/simulacros")
@Secured(SecurityRule.IS_AUTHENTICATED)
@Produces(MediaType.TEXT_HTML)
@ExecuteOn(TaskExecutors.BLOCKING)
public class MockExamWebController {

    private final QuestionApiClient client;
    private final SecurityService securityService;

    public MockExamWebController(QuestionApiClient client, SecurityService securityService) {
        this.client = client;
        this.securityService = securityService;
    }

    // --- Listado y detalle ---------------------------------------------------

    @Get
    public ModelAndView<Map<String, Object>> list() {
        Map<String, Object> model = new HashMap<>();
        try {
            model.put("mockExams", client.listMockExams());
        } catch (Exception e) {
            model.put("error", "No se pudieron cargar los simulacros: " + rootMessage(e));
        }
        model.put("canManage", canManage());
        return new ModelAndView<>("simulacro/list", model);
    }

    @Get("/{id}")
    public HttpResponse<?> detail(Long id, @QueryValue Optional<String> error) {
        Map<String, Object> model = new HashMap<>();
        try {
            model.put("mockExam", client.getMockExam(id));
            List<MockExamAttemptSummaryResponse> attempts = client.listMockExamAttempts(id);
            model.put("attempts", attempts);
            model.put("inProgressAttemptId", attempts.stream()
                    .filter(a -> !a.finished())
                    .map(MockExamAttemptSummaryResponse::id)
                    .findFirst()
                    .orElse(null));
        } catch (Exception e) {
            model.put("error", "No se pudo cargar el simulacro: " + rootMessage(e));
        }
        if (error.isPresent() && !model.containsKey("error")) {
            model.put("error", "No se pudo iniciar el simulacro. Inténtalo de nuevo.");
        }        model.put("canManage", canManage());
        return HttpResponse.ok(new ModelAndView<>("simulacro/detail", model));
    }

    // --- Gestión (ADMIN/CREATOR) --------------------------------------------

    @Get("/new")
    @Secured({"ROLE_ADMIN", "ROLE_CREATOR"})
    public ModelAndView<Map<String, Object>> createForm() {
        return new ModelAndView<>("simulacro/form", formModel(null, new MockExamForm(null, null, null, List.of()), null));
    }

    @Post("/new")
    @Secured({"ROLE_ADMIN", "ROLE_CREATOR"})
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public HttpResponse<?> create(@Body MockExamForm form) {
        try {
            MockExamResponse created = client.createMockExam(form.toApiRequest());
            return HttpResponse.seeOther(URI.create("/simulacros/" + created.id()));
        } catch (Exception e) {
            return HttpResponse.ok(new ModelAndView<>("simulacro/form",
                    formModel(null, form, "No se pudo crear el simulacro: " + rootMessage(e))));
        }
    }

    @Get("/{id}/edit")
    @Secured({"ROLE_ADMIN", "ROLE_CREATOR"})
    public HttpResponse<?> editForm(Long id) {
        try {
            MockExamResponse exam = client.getMockExam(id);
            List<Long> selected = exam.questions().stream()
                    .map(MockExamResponse.QuestionSummary::questionId)
                    .toList();
            MockExamForm form = new MockExamForm(exam.title(), exam.description(), examTypeId(exam.examTypeCode()), selected);
            return HttpResponse.ok(new ModelAndView<>("simulacro/form", formModel(id, form, null)));
        } catch (Exception e) {
            return HttpResponse.ok(new ModelAndView<>("simulacro/form",
                    formModel(null, new MockExamForm(null, null, null, List.of()),
                            "No se pudo cargar el simulacro: " + rootMessage(e))));
        }
    }

    @Post("/{id}/edit")
    @Secured({"ROLE_ADMIN", "ROLE_CREATOR"})
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public HttpResponse<?> edit(Long id, @Body MockExamForm form) {
        try {
            client.updateMockExam(id, form.toApiRequest());
            return HttpResponse.seeOther(URI.create("/simulacros/" + id));
        } catch (Exception e) {
            return HttpResponse.ok(new ModelAndView<>("simulacro/form",
                    formModel(id, form, "No se pudo guardar el simulacro: " + rootMessage(e))));
        }
    }

    @Post("/{id}/delete")
    @Secured({"ROLE_ADMIN", "ROLE_CREATOR"})
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public HttpResponse<?> delete(Long id) {
        try {
            client.deleteMockExam(id);
        } catch (Exception ignored) {}
        return HttpResponse.seeOther(URI.create("/simulacros"));
    }

    // --- Intentos ------------------------------------------------------------

    @Post("/{id}/start")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public HttpResponse<?> start(Long id) {
        try {
            MockExamAttemptResponse attempt = client.startMockExamAttempt(id);
            return HttpResponse.seeOther(URI.create("/simulacros/" + id + "/attempts/" + attempt.id()));
        } catch (Exception e) {
            return HttpResponse.seeOther(URI.create("/simulacros/" + id + "?error=1"));
        }
    }

    @Get("/{id}/attempts/{attemptId}")
    public HttpResponse<?> attempt(Long id, Long attemptId,
                                   @QueryValue Optional<Integer> position,
                                   @QueryValue Optional<String> saved) {
        MockExamAttemptResponse attempt;
        try {
            attempt = client.getMockExamAttempt(attemptId);
        } catch (Exception e) {
            return HttpResponse.seeOther(URI.create("/simulacros/" + id));
        }
        if (attempt.finished()) {
            return HttpResponse.seeOther(URI.create("/simulacros/" + id + "/attempts/" + attemptId + "/result"));
        }

        int currentPosition = position.orElseGet(() -> firstPendingPosition(attempt));
        MockExamAttemptResponse.Item current = itemAt(attempt, currentPosition);

        Map<String, Object> model = new HashMap<>();
        model.put("mockExamId", id);
        model.put("attempt", attempt);
        model.put("current", current);
        model.put("currentPosition", current == null ? 1 : current.position());
        model.put("saved", saved.isPresent());
        return HttpResponse.ok(new ModelAndView<>("simulacro/attempt", model));
    }

    @Post("/{id}/attempts/{attemptId}/answer")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public HttpResponse<?> answer(Long id, Long attemptId, @Body MockExamAnswerForm form) {
        try {
            if (form.position() != null && form.hasLetter()) {
                client.answerMockExamAttempt(attemptId, new AnswerRequest(form.position(), form.letter()));
            }
        } catch (Exception e) {
            return HttpResponse.seeOther(URI.create("/simulacros/" + id + "/attempts/" + attemptId));
        }

        if (form.goNext()) {
            MockExamAttemptResponse attempt = client.getMockExamAttempt(attemptId);
            int next = nextPosition(attempt, form.position() == null ? 1 : form.position());
            return HttpResponse.seeOther(URI.create(
                    "/simulacros/" + id + "/attempts/" + attemptId + "?position=" + next));
        }
        return HttpResponse.seeOther(URI.create(
                "/simulacros/" + id + "/attempts/" + attemptId
                        + "?position=" + form.position() + "&saved=1"));
    }

    @Post("/{id}/attempts/{attemptId}/finish")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public HttpResponse<?> finish(Long id, Long attemptId) {
        try {
            client.finishMockExamAttempt(attemptId);
        } catch (Exception ignored) {}
        return HttpResponse.seeOther(URI.create(
                "/simulacros/" + id + "/attempts/" + attemptId + "/result"));
    }

    @Get("/{id}/attempts/{attemptId}/result")
    public ModelAndView<Map<String, Object>> result(Long id, Long attemptId) {
        Map<String, Object> model = new HashMap<>();
        try {
            model.put("attempt", client.mockExamAttemptResult(attemptId));
        } catch (Exception e) {
            model.put("error", "No se pudo cargar el resultado: " + rootMessage(e));
        }
        model.put("mockExamId", id);
        model.put("blankCount", blankCount(model.get("attempt")));
        return new ModelAndView<>("simulacro/result", model);
    }

    // --- Helpers -------------------------------------------------------------

    private Map<String, Object> formModel(Long id, MockExamForm form, String error) {
        Map<String, Object> model = new HashMap<>();
        model.put("mockExamId", id);
        model.put("editing", id != null);
        model.put("form", form);
        model.put("examTypes", safeExamTypes());
        model.put("questions", safeQuestions());
        model.put("selectedIds", form.questionIds() == null ? List.of() : form.questionIds());
        if (error != null) {
            model.put("error", error);
        }
        return model;
    }

    private boolean canManage() {
        return securityService.hasRole("ROLE_ADMIN") || securityService.hasRole("ROLE_CREATOR");
    }

    private Long examTypeId(String code) {
        return safeExamTypes().stream()
                .filter(t -> t.code().equals(code))
                .map(ExamTypeResponse::id)
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

    private List<QuestionResponse> safeQuestions() {
        try {
            return client.listQuestions();
        } catch (Exception e) {
            return List.of();
        }
    }

    private static MockExamAttemptResponse.Item itemAt(MockExamAttemptResponse attempt, int position) {
        return attempt.items().stream()
                .filter(i -> i.position() == position)
                .findFirst()
                .orElse(attempt.items().isEmpty() ? null : attempt.items().get(0));
    }

    private static int firstPendingPosition(MockExamAttemptResponse attempt) {
        return attempt.items().stream()
                .filter(i -> !i.answered())
                .map(MockExamAttemptResponse.Item::position)
                .findFirst()
                .orElse(1);
    }

    /** Siguiente posición pendiente después de {@code position}; si no hay, se queda. */
    private static int nextPosition(MockExamAttemptResponse attempt, int position) {
        return attempt.items().stream()
                .filter(i -> i.position() > position && !i.answered())
                .map(MockExamAttemptResponse.Item::position)
                .findFirst()
                .orElseGet(() -> attempt.items().stream()
                        .filter(i -> !i.answered())
                        .map(MockExamAttemptResponse.Item::position)
                        .findFirst()
                        .orElse(position));
    }

    private static int blankCount(Object attempt) {
        if (!(attempt instanceof MockExamAttemptResponse a)) {
            return 0;
        }
        return (int) a.items().stream().filter(i -> !i.answered()).count();
    }

    private static String rootMessage(Throwable e) {
        Throwable cause = e;
        while (cause.getCause() != null && cause.getCause() != cause) {
            cause = cause.getCause();
        }
        return cause.getMessage() == null ? "error inesperado" : cause.getMessage();
    }
}
