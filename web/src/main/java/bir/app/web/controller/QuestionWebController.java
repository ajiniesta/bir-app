package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.ExamTypeResponse;
import bir.app.web.dto.QuestionForm;
import bir.app.web.dto.QuestionFormSubmission;
import bir.app.web.dto.QuestionImportRequest;
import bir.app.web.dto.QuestionImportResponse;
import bir.app.web.dto.QuestionPageResponse;
import bir.app.web.dto.QuestionResponse;
import bir.app.web.dto.QuestionSummaryResponse;
import bir.app.web.support.NavService;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.micronaut.http.multipart.CompletedFileUpload;
import io.micronaut.scheduling.TaskExecutors;
import io.micronaut.scheduling.annotation.ExecuteOn;
import io.micronaut.security.annotation.Secured;
import io.micronaut.views.ModelAndView;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Controller("/questions")
@Secured({"ROLE_ADMIN", "ROLE_CREATOR"})
@Produces(MediaType.TEXT_HTML)
@ExecuteOn(TaskExecutors.BLOCKING)
public class QuestionWebController {

    private static final int PAGE_SIZE = 20;
    private static final String NO_CATEGORY = "__NONE__";
    /** Número máximo de enlaces de página que se muestran en el paginador. */
    private static final int PAGE_WINDOW = 7;

    private final QuestionApiClient client;
    private final NavService navService;

    public QuestionWebController(QuestionApiClient client, NavService navService) {
        this.client = client;
        this.navService = navService;
    }

    @Get
    public ModelAndView<Map<String, Object>> list(@QueryValue Optional<String> examType,
                                                  @QueryValue Optional<String> category,
                                                  @QueryValue Optional<String> q,
                                                  @QueryValue Optional<Integer> page) {
        int requestedPage = page.filter(p -> p > 0).orElse(1);
        String examTypeCode = blankToNull(examType.orElse(null));
        String categoryFilter = blankToNull(category.orElse(null));
        String searchText = blankToNull(q.orElse(null));

        List<QuestionSummaryResponse> questions = List.of();
        int currentPage = 1;
        int totalPages = 0;
        long total = 0;
        int pageSize = PAGE_SIZE;
        String error = null;
        try {
            QuestionPageResponse result = client.searchQuestions(
                    requestedPage, PAGE_SIZE, searchText, examTypeCode, categoryFilter);
            // Micronaut Serde omite las listas vacías al serializar, así que
            // `items` puede llegar como null cuando no hay resultados.
            questions = result.items() == null ? List.of() : result.items();
            currentPage = result.page();
            totalPages = result.totalPages();
            total = result.total();
            pageSize = result.size();
        } catch (Exception e) {
            error = "No se pudieron cargar las preguntas: " + rootMessage(e);
        }

        Map<String, Object> model = new HashMap<>();
        model.put("questions", questions);
        model.put("examTypes", examTypes());
        model.put("categories", categories());
        model.put("selectedExamType", examTypeCode == null ? "" : examTypeCode);
        model.put("selectedCategory", categoryFilter == null ? "" : categoryFilter);
        model.put("noCategoryValue", NO_CATEGORY);
        model.put("searchText", searchText == null ? "" : searchText);
        model.put("page", currentPage);
        model.put("pageSize", pageSize);
        model.put("totalPages", totalPages);
        model.put("total", total);
        model.put("pageNumbers", pageNumbers(currentPage, totalPages));
        model.put("from", total == 0 ? 0L : (long) (currentPage - 1) * pageSize + 1);
        model.put("to", total == 0 ? 0L : Math.min(total, (long) currentPage * pageSize));
        if (error != null) {
            model.put("error", error);
        }
        return new ModelAndView<>("question/list", navService.addTo(model));
    }

    @Get("/import")
    public ModelAndView<Map<String, Object>> importForm() {
        return new ModelAndView<>("question/import", navService.addTo(new HashMap<>()));
    }

    @Post("/import")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public HttpResponse<?> importQuestions(@Nullable @Part("file") CompletedFileUpload file) {
        Map<String, Object> model = new HashMap<>();
        if (file == null || file.getSize() == 0) {
            model.put("error", "Selecciona un fichero con preguntas.");
        } else {
            try {
                String raw = new String(file.getBytes(), StandardCharsets.UTF_8);
                QuestionImportResponse result = client.importQuestions(new QuestionImportRequest(raw));
                model.put("result", result);
            } catch (Exception e) {
                model.put("error", "No se pudo importar el fichero: " + e.getMessage());
            }
        }
        return HttpResponse.ok(new ModelAndView<>("question/import", navService.addTo(model)));
    }

    @Get("/{id}")
    public ModelAndView<Map<String, Object>> detail(Long id) {
        Optional<QuestionResponse> question = client.getQuestion(id);
        Map<String, Object> model = new HashMap<>();
        question.ifPresentOrElse(
            q -> model.put("question", q),
            () -> model.put("error", "Question not found")
        );
        return new ModelAndView<>("question/detail", navService.addTo(model));
    }

    @Get("/create")
    public ModelAndView<Map<String, Object>> createForm() {
        return new ModelAndView<>("question/create", formModel(QuestionForm.empty()));
    }

    @Post("/create")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public HttpResponse<?> create(@Body QuestionFormSubmission submission) {
        try {
            client.createQuestion(submission.toApiRequest());
            return HttpResponse.seeOther(URI.create("/questions"));
        } catch (Exception e) {
            Map<String, Object> model = new HashMap<>();
            model.put("form", QuestionForm.of(submission, null, examTypes()));
            model.put("error", "Failed to create question: " + e.getMessage());
            model.put("examTypes", examTypes());
            return HttpResponse.ok(new ModelAndView<>("question/create", navService.addTo(model)));
        }
    }

    @Get("/{id}/edit")
    public ModelAndView<Map<String, Object>> editForm(Long id) {
        Optional<QuestionResponse> question = client.getQuestion(id);
        if (question.isPresent()) {
            return new ModelAndView<>("question/create", formModel(QuestionForm.of(question.get())));
        }
        Map<String, Object> model = formModel(QuestionForm.empty());
        model.put("error", "Question not found");
        return new ModelAndView<>("question/create", model);
    }

    @Post("/{id}/edit")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public HttpResponse<?> edit(Long id, @Body QuestionFormSubmission submission) {
        try {
            client.updateQuestion(id, submission.toApiRequest());
            return HttpResponse.seeOther(URI.create("/questions"));
        } catch (Exception e) {
            Map<String, Object> model = new HashMap<>();
            model.put("form", QuestionForm.of(submission, id, examTypes()));
            model.put("error", "Failed to update question: " + e.getMessage());
            model.put("examTypes", examTypes());
            return HttpResponse.ok(new ModelAndView<>("question/create", navService.addTo(model)));
        }
    }

    @Post("/{id}/delete")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public HttpResponse<?> delete(Long id) {
        try {
            client.deleteQuestion(id);
        } catch (Exception ignored) {}
        return HttpResponse.seeOther(URI.create("/questions"));
    }

    private Map<String, Object> formModel(QuestionForm form) {
        Map<String, Object> model = new HashMap<>();
        model.put("form", form);
        model.put("examTypes", examTypes());
        return navService.addTo(model);
    }

    private List<ExamTypeResponse> examTypes() {
        try {
            return client.listExamTypes();
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<String> categories() {
        try {
            return client.listCategories();
        } catch (Exception e) {
            return List.of();
        }
    }

    /** Ventana de números de página alrededor de la actual. */
    private static List<Integer> pageNumbers(int current, int totalPages) {
        if (totalPages <= 1) {
            return List.of();
        }
        int start = Math.max(1, current - PAGE_WINDOW / 2);
        int end = Math.min(totalPages, start + PAGE_WINDOW - 1);
        start = Math.max(1, end - PAGE_WINDOW + 1);
        List<Integer> numbers = new ArrayList<>();
        for (int i = start; i <= end; i++) {
            numbers.add(i);
        }
        return numbers;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String rootMessage(Throwable e) {
        Throwable cause = e;
        while (cause.getCause() != null && cause.getCause() != cause) {
            cause = cause.getCause();
        }
        return cause.getMessage() == null ? "error inesperado" : cause.getMessage();
    }
}
