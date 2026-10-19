package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.*;
import bir.app.web.support.MockExamPdfService;
import bir.app.web.support.NavService;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.micronaut.scheduling.TaskExecutors;
import io.micronaut.scheduling.annotation.ExecuteOn;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.security.utils.SecurityService;
import io.micronaut.views.ModelAndView;

import java.net.URI;
import java.net.URLEncoder;
import java.text.Normalizer;
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
    private final NavService navService;
    private final MockExamPdfService pdfService;

    public MockExamWebController(QuestionApiClient client, SecurityService securityService,
                                 NavService navService, MockExamPdfService pdfService) {
        this.client = client;
        this.securityService = securityService;
        this.navService = navService;
        this.pdfService = pdfService;
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
        return new ModelAndView<>("simulacro/list", navService.addTo(model));
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
        return HttpResponse.ok(new ModelAndView<>("simulacro/detail", navService.addTo(model)));
    }

    // --- PDF imprimible ------------------------------------------------------

    /** Descarga el simulacro completo en PDF (sin respuestas) para imprimir. */
    @Get("/{id}/pdf")
    @Produces(MediaType.APPLICATION_PDF)
    public HttpResponse<?> pdf(Long id) {
        MockExamResponse exam;
        try {
            exam = client.getMockExam(id);
        } catch (Exception e) {
            return HttpResponse.status(HttpStatus.NOT_FOUND)
                    .contentType(MediaType.TEXT_PLAIN).body("Simulacro no encontrado");
        }
        try {
            byte[] bytes = pdfService.render(exam);
            String filename = "simulacro-" + id + "-" + slug(exam.title()) + ".pdf";
            return HttpResponse.ok(bytes)
                    .contentType(MediaType.APPLICATION_PDF)
                    .header("Content-Disposition", "inline; filename=\"" + filename + "\"");
        } catch (Exception e) {
            return HttpResponse.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .contentType(MediaType.TEXT_PLAIN)
                    .body("No se pudo generar el PDF: " + rootMessage(e));
        }
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
        return HttpResponse.ok(new ModelAndView<>("simulacro/attempt", navService.addTo(model)));
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
    public ModelAndView<Map<String, Object>> result(Long id, Long attemptId,
                                                    @QueryValue Optional<String> proposed,
                                                    @QueryValue Optional<String> proposalError) {
        Map<String, Object> model = new HashMap<>();
        MockExamAttemptResponse attempt = null;
        try {
            attempt = client.mockExamAttemptResult(attemptId);
            model.put("attempt", attempt);
        } catch (Exception e) {
            model.put("error", "No se pudo cargar el resultado: " + rootMessage(e));
        }
        model.put("mockExamId", id);
        model.put("blankCount", blankCount(attempt));
        model.put("myProposals", proposalsByQuestion(attempt));
        model.put("proposed", proposed.isPresent());
        model.put("proposalError", proposalError.orElse(null));
        return new ModelAndView<>("simulacro/result", navService.addTo(model));
    }

    /** Guarda una propuesta de respuesta alternativa desde la revisión del intento. */
    @Post("/{id}/attempts/{attemptId}/proposals")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public HttpResponse<?> propose(Long id, Long attemptId, @Body ProposalForm form) {
        String base = "/simulacros/" + id + "/attempts/" + attemptId + "/result";
        try {
            client.proposeAnswer(new CreateAnswerProposalRequest(
                    form.questionId(), form.proposedLetter(), form.proposedText(), form.comment(),
                    "MOCK_EXAM_ATTEMPT", attemptId, form.position(), form.selectedLetter()));
            return HttpResponse.seeOther(URI.create(base + "?proposed=1"));
        } catch (Exception e) {
            return HttpResponse.seeOther(URI.create(base + "?proposalError="
                    + URLEncoder.encode(rootMessage(e), java.nio.charset.StandardCharsets.UTF_8)));
        }
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
        return navService.addTo(model);
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

    /** Mis propuestas para las preguntas del intento, indexadas por pregunta. */
    private Map<Long, MyProposalResponse> proposalsByQuestion(MockExamAttemptResponse attempt) {
        if (attempt == null || attempt.items().isEmpty()) {
            return Map.of();
        }
        List<Long> ids = attempt.items().stream()
                .map(MockExamAttemptResponse.Item::questionId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        try {
            Map<Long, MyProposalResponse> byQuestion = new HashMap<>();
            for (MyProposalResponse proposal : client.myProposals(ids)) {
                byQuestion.put(proposal.questionId(), proposal);
            }
            return byQuestion;
        } catch (Exception e) {
            return Map.of();
        }
    }

    private static String rootMessage(Throwable e) {
        Throwable cause = e;
        while (cause.getCause() != null && cause.getCause() != cause) {
            cause = cause.getCause();
        }
        return cause.getMessage() == null ? "error inesperado" : cause.getMessage();
    }

    /** Convierte el título en un fragmento de nombre de fichero seguro. */
    private static String slug(String value) {
        if (value == null || value.isBlank()) {
            return "simulacro";
        }
        String slug = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
        return slug.isBlank() ? "simulacro" : slug;
    }
}
