package bir.app.api.controller;

import bir.app.api.dto.CreateQuestionRequest;
import bir.app.api.dto.QuestionResponse;
import bir.app.api.service.QuestionService;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@Controller("/api/questions")
public class QuestionController {

    private final QuestionService questionService;

    public QuestionController(QuestionService questionService) {
        this.questionService = questionService;
    }

    @Get
    public List<QuestionResponse> list() {
        return questionService.findAll();
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
    public List<QuestionResponse> filter(String examType) {
        if (examType != null && !examType.isBlank()) {
            return questionService.findByExamType(examType);
        }
        return questionService.findAll();
    }
}
