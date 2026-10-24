package bir.app.api.controller;

import bir.app.api.dto.CreateQuestionRequest;
import bir.app.api.dto.QuestionImportRequest;
import bir.app.api.dto.QuestionImportResponse;
import bir.app.api.dto.QuestionPageResponse;
import bir.app.api.dto.QuestionResponse;
import bir.app.api.service.QuestionImportService;
import bir.app.api.service.QuestionService;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.*;
import io.micronaut.security.annotation.Secured;
import jakarta.validation.Valid;

import java.util.List;

@Controller("/api/questions")
@Secured({"ROLE_ADMIN", "ROLE_CREATOR"})
public class QuestionController {

    private final QuestionService questionService;
    private final QuestionImportService questionImportService;

    public QuestionController(QuestionService questionService,
                              QuestionImportService questionImportService) {
        this.questionService = questionService;
        this.questionImportService = questionImportService;
    }

    @Get
    public List<QuestionResponse> list() {
        return questionService.findAll();
    }

    /**
     * Listado paginado para la pantalla de preguntas: filtros opcionales por
     * texto del enunciado, banco y categoría.
     */
    @Get("/page{?page,size,q,examType,category}")
    public QuestionPageResponse page(@Nullable Integer page,
                                     @Nullable Integer size,
                                     @Nullable String q,
                                     @Nullable String examType,
                                     @Nullable String category) {
        return questionService.search(page, size, q, examType, category);
    }

    @Get("/categories")
    public List<String> categories() {
        return questionService.listCategories();
    }

    @Get("/{id}")
    public QuestionResponse get(Long id) {
        return questionService.findById(id);
    }

    @Post
    @Status(HttpStatus.CREATED)
    public QuestionResponse create(@Body @Valid CreateQuestionRequest request) {
        return questionService.create(request);
    }

    /**
     * Importa preguntas desde el texto crudo de un fichero. Las preguntas
     * válidas se guardan y las defectuosas se descartan, informando del motivo.
     */
    @Post("/import")
    public QuestionImportResponse importQuestions(@Body QuestionImportRequest request) {
        return questionImportService.importQuestions(request == null ? null : request.content());
    }

    @Put("/{id}")
    public QuestionResponse update(Long id, @Body @Valid CreateQuestionRequest request) {
        return questionService.update(id, request);
    }

    @Delete("/{id}")
    @Status(HttpStatus.NO_CONTENT)
    public void delete(Long id) {
        questionService.delete(id);
    }

    @Get("/filter{?examType}")
    public List<QuestionResponse> filter(@Nullable String examType) {
        if (examType != null && !examType.isBlank()) {
            return questionService.findByExamType(examType);
        }
        return questionService.findAll();
    }
}
