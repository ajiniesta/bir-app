package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.DuplicatePurgeRequest;
import bir.app.web.dto.DuplicatePurgeResponse;
import bir.app.web.dto.DuplicateQuestionsResponse;
import bir.app.web.dto.ExamTypeResponse;
import bir.app.web.dto.QuestionForm;
import bir.app.web.dto.QuestionFormSubmission;
import bir.app.web.dto.QuestionImportBatchResponse;
import bir.app.web.dto.QuestionImportRequest;
import bir.app.web.dto.QuestionImportResponse;
import bir.app.web.dto.QuestionPageResponse;
import bir.app.web.dto.QuestionResponse;
import bir.app.web.dto.QuestionSummaryResponse;
import bir.app.web.support.NavService;
import bir.app.web.support.QuestionImportJob;
import bir.app.web.support.QuestionImportStore;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.micronaut.http.multipart.CompletedFileUpload;
import io.micronaut.scheduling.TaskExecutors;
import io.micronaut.scheduling.annotation.ExecuteOn;
import io.micronaut.security.annotation.Secured;
import io.micronaut.session.Session;
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
    private static final String NO_TAG = "__NONE__";
    /** Número máximo de enlaces de página que se muestran en el paginador. */
    private static final int PAGE_WINDOW = 7;

    private final QuestionApiClient client;
    private final NavService navService;
    private final QuestionImportStore importStore;

    public QuestionWebController(QuestionApiClient client,
                                 NavService navService,
                                 QuestionImportStore importStore) {
        this.client = client;
        this.navService = navService;
        this.importStore = importStore;
    }

    @Get
    public ModelAndView<Map<String, Object>> list(@QueryValue Optional<String> examType,
                                                  @QueryValue Optional<String> category,
                                                  @QueryValue Optional<String> tag,
                                                  @QueryValue Optional<String> q,
                                                  @QueryValue Optional<Integer> page) {
        int requestedPage = page.filter(p -> p > 0).orElse(1);
        String examTypeCode = blankToNull(examType.orElse(null));
        String categoryFilter = blankToNull(category.orElse(null));
        String tagFilter = blankToNull(tag.orElse(null));
        String searchText = blankToNull(q.orElse(null));

        List<QuestionSummaryResponse> questions = List.of();
        int currentPage = 1;
        int totalPages = 0;
        long total = 0;
        int pageSize = PAGE_SIZE;
        String error = null;
        try {
            QuestionPageResponse result = client.searchQuestions(
                    requestedPage, PAGE_SIZE, searchText, examTypeCode, categoryFilter, tagFilter);
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
        model.put("tags", tags());
        model.put("selectedExamType", examTypeCode == null ? "" : examTypeCode);
        model.put("selectedCategory", categoryFilter == null ? "" : categoryFilter);
        model.put("selectedTag", tagFilter == null ? "" : tagFilter);
        model.put("noCategoryValue", NO_CATEGORY);
        model.put("noTagValue", NO_TAG);
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
    public HttpResponse<?> importQuestions(@Nullable @Part("file") CompletedFileUpload file, Session session) {
        if (file == null || file.getSize() == 0) {
            return renderImport(Map.of("error", "Selecciona un fichero con preguntas."));
        }

        String raw;
        try {
            raw = new String(file.getBytes(), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return renderImport(Map.of("error", "No se pudo leer el fichero: " + rootMessage(e)));
        }

        Optional<QuestionImportJob> job = importStore.start(session, raw);
        if (job.isEmpty()) {
            return renderImport(Map.of("error",
                    "No se ha encontrado ninguna pregunta en el fichero (¿JSON mal formado?)."));
        }

        // El fichero queda troceado en la sesión: la vista pide los lotes de uno
        // en uno, así ninguna petición se acerca al read-timeout del cliente HTTP.
        QuestionImportJob importJob = job.get();
        Map<String, Object> model = new HashMap<>();
        model.put("importId", importJob.id());
        model.put("totalBatches", importJob.totalBatches());
        model.put("totalQuestions", importJob.totalQuestions());
        model.put("batchSize", QuestionImportStore.BATCH_SIZE);
        return HttpResponse.ok(new ModelAndView<>("question/import", navService.addTo(model)));
    }

    /**
     * Procesa un lote de la importación en curso y devuelve su resumen en JSON.
     * Lo llama la barra de progreso de la vista, lote a lote.
     */
    @Post("/import/batch")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Produces(MediaType.APPLICATION_JSON)
    public HttpResponse<?> importBatch(@Nullable String importId,
                                       @Nullable Integer index,
                                       Session session) {
        if (index == null || index < 0) {
            return jsonError(HttpStatus.BAD_REQUEST, "Falta el número de lote.");
        }
        Optional<QuestionImportJob> job = importStore.find(session, importId);
        if (job.isEmpty()) {
            return jsonError(HttpStatus.BAD_REQUEST,
                    "La importación ha caducado. Vuelve a subir el fichero.");
        }
        QuestionImportJob importJob = job.get();
        Optional<String> content = importJob.batch(index);
        if (content.isEmpty()) {
            return jsonError(HttpStatus.BAD_REQUEST, "Lote fuera de rango.");
        }

        try {
            QuestionImportResponse result = client.importQuestions(
                    new QuestionImportRequest(content.get(), index * QuestionImportStore.BATCH_SIZE));
            if (index + 1 >= importJob.totalBatches()) {
                importStore.clear(session);
            }
            return HttpResponse.ok(new QuestionImportBatchResponse(
                            index, importJob.totalBatches(), result.total(), result.imported(),
                            result.skipped(), result.duplicates(), result.errors()))
                    .contentType(MediaType.APPLICATION_JSON_TYPE);
        } catch (Exception e) {
            return jsonError(HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo importar el lote " + (index + 1) + ": " + rootMessage(e));
        }
    }

    /**
     * Respaldo sin JavaScript: procesa todos los lotes de una vez. Cada lote es
     * una petición independiente a la API, pero la respuesta al navegador llega
     * al final, así que para ficheros enormes conviene la barra de progreso.
     */
    @Post("/import/all")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public HttpResponse<?> importAll(@Nullable String importId, Session session) {
        Optional<QuestionImportJob> job = importStore.find(session, importId);
        if (job.isEmpty()) {
            return renderImport(Map.of("error",
                    "La importación ha caducado. Vuelve a subir el fichero."));
        }

        QuestionImportJob importJob = job.get();
        QuestionImportResponse total = QuestionImportResponse.empty();
        List<String> batchErrors = new ArrayList<>();
        for (int index = 0; index < importJob.totalBatches(); index++) {
            try {
                total = total.plus(client.importQuestions(new QuestionImportRequest(
                        importJob.batch(index).orElse(""), index * QuestionImportStore.BATCH_SIZE)));
            } catch (Exception e) {
                batchErrors.add("Lote " + (index + 1) + ": " + rootMessage(e));
            }
        }
        importStore.clear(session);

        Map<String, Object> model = new HashMap<>();
        model.put("result", total);
        if (!batchErrors.isEmpty()) {
            model.put("batchErrors", batchErrors);
        }
        return renderImport(model);
    }

    /**
     * Vista previa de las preguntas duplicadas (mismo banco, mismo enunciado
     * normalizado y mismas opciones). Solo lee: nada se borra hasta confirmar.
     */
    @Get("/duplicates")
    public ModelAndView<Map<String, Object>> duplicates(@QueryValue Optional<String> examType) {
        String examTypeCode = blankToNull(examType.orElse(null));

        Map<String, Object> model = new HashMap<>();
        model.put("examTypes", examTypes());
        model.put("selectedExamType", examTypeCode == null ? "" : examTypeCode);
        if (examTypeCode == null) {
            model.put("notice", "Elige un banco para revisar sus posibles duplicados.");
            return new ModelAndView<>("question/duplicates", navService.addTo(model));
        }

        try {
            model.put("preview", client.findDuplicateQuestions(examTypeCode));
        } catch (Exception e) {
            model.put("error", "No se pudieron buscar los duplicados: " + rootMessage(e));
        }
        return new ModelAndView<>("question/duplicates", navService.addTo(model));
    }

    /**
     * Limpia una tanda de duplicadas y devuelve los contadores en JSON. La vista
     * la repite mientras {@code remaining} sea mayor que 0, así ninguna petición
     * se acerca al timeout del cliente HTTP.
     */
    @Post("/duplicates/purge/batch")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Produces(MediaType.APPLICATION_JSON)
    public HttpResponse<?> purgeDuplicatesBatch(@Nullable String examType) {
        String examTypeCode = blankToNull(examType);
        if (examTypeCode == null) {
            return jsonError(HttpStatus.BAD_REQUEST, "Elige un banco antes de borrar duplicados.");
        }
        try {
            DuplicatePurgeResponse result = client.purgeDuplicateQuestions(
                    new DuplicatePurgeRequest(examTypeCode, null));
            return HttpResponse.ok(result).contentType(MediaType.APPLICATION_JSON_TYPE);
        } catch (Exception e) {
            return jsonError(HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudieron borrar los duplicados: " + rootMessage(e));
        }
    }

    /**
     * Respaldo sin JavaScript: repite la purga hasta que no queden grupos y
     * muestra el resumen agregado. Tope de iteraciones por seguridad.
     */
    @Post("/duplicates/purge")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public HttpResponse<?> purgeDuplicates(@Nullable String examType) {
        String examTypeCode = blankToNull(examType);
        if (examTypeCode == null) {
            return renderDuplicates(Map.of("error", "Elige un banco antes de borrar duplicados."));
        }

        Map<String, Object> model = new HashMap<>();
        model.put("examTypes", examTypes());
        model.put("selectedExamType", examTypeCode);
        try {
            DuplicatePurgeResponse total = DuplicatePurgeResponse.empty();
            int passes = 0;
            do {
                DuplicatePurgeResponse pass = client.purgeDuplicateQuestions(
                        new DuplicatePurgeRequest(examTypeCode, null));
                total = total.plus(pass);
                passes++;
            } while (total.remaining() > 0 && passes < 50);
            model.put("summary", total);
            model.put("preview", client.findDuplicateQuestions(examTypeCode));
        } catch (Exception e) {
            model.put("error", "No se pudieron borrar los duplicados: " + rootMessage(e));
        }
        return HttpResponse.ok(new ModelAndView<>("question/duplicates", navService.addTo(model)));
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
        model.put("tags", tags());
        return navService.addTo(model);
    }

    /** Renderiza la vista de duplicadas con el modelo indicado. */
    private HttpResponse<?> renderDuplicates(Map<String, Object> model) {
        return HttpResponse.ok(new ModelAndView<>(
                "question/duplicates", navService.addTo(new HashMap<>(model))));
    }

    /** Renderiza la vista de importación con el modelo indicado. */
    private HttpResponse<?> renderImport(Map<String, Object> model) {
        return HttpResponse.ok(new ModelAndView<>(
                "question/import", navService.addTo(new HashMap<>(model))));
    }

    /**
     * Error en JSON para la barra de progreso. El tipo de contenido se fija a
     * mano porque este controlador produce HTML por defecto y el navegador no
     * negocia: siempre espera JSON de este endpoint.
     */
    private static HttpResponse<?> jsonError(HttpStatus status, String message) {
        return HttpResponse.<Map<String, String>>status(status)
                .body(Map.of("error", message))
                .contentType(MediaType.APPLICATION_JSON_TYPE);
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

    private List<String> tags() {
        try {
            return client.listTags();
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
