package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.CreateQuestionRequest;
import bir.app.web.dto.QuestionResponse;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.*;
import io.micronaut.views.ModelAndView;
import jakarta.validation.Valid;

import java.net.URI;
import java.util.*;

@Controller("/questions")
public class QuestionWebController {

    private static final List<String> EXAMS = List.of("MIR", "EIR", "BIR", "FIR", "PIR", "QIR", "RFIR");
    private static final List<String> LETTERS = List.of("A", "B", "C", "D");

    private final QuestionApiClient client;

    public QuestionWebController(QuestionApiClient client) {
        this.client = client;
    }

    @Get
    public ModelAndView<Map<String, Object>> list(@QueryValue Optional<String> examType) {
        List<QuestionResponse> questions;
        if (examType.isPresent() && !examType.get().isBlank()) {
            questions = client.filterQuestions(examType.get());
        } else {
            questions = client.listQuestions();
        }
        Map<String, Object> model = new HashMap<>();
        model.put("questions", questions);
        model.put("examTypes", EXAMS);
        model.put("selectedExamType", examType.orElse(""));
        return new ModelAndView<>("question/list", model);
    }

    @Get("/{id}")
    public ModelAndView<Map<String, Object>> detail(Long id) {
        Optional<QuestionResponse> question = client.getQuestion(id);
        Map<String, Object> model = new HashMap<>();
        question.ifPresentOrElse(
            q -> model.put("question", q),
            () -> model.put("error", "Question not found")
        );
        return new ModelAndView<>("question/detail", model);
    }

    @Get("/create")
    public ModelAndView<Map<String, Object>> createForm() {
        Map<String, Object> model = new HashMap<>();
        model.put("examTypes", EXAMS);
        model.put("letters", LETTERS);
        return new ModelAndView<>("question/create", model);
    }

    @Post("/create")
    public HttpResponse<?> create(@Body @Valid CreateQuestionRequest request) {
        try {
            client.createQuestion(request);
            return HttpResponse.redirect(URI.create("/questions"));
        } catch (Exception e) {
            Map<String, Object> model = new HashMap<>();
            model.put("examTypes", EXAMS);
            model.put("letters", LETTERS);
            model.put("error", "Failed to create question: " + e.getMessage());
            model.put("request", request);
            return HttpResponse.ok(new ModelAndView<>("question/create", model));
        }
    }

    @Get("/{id}/edit")
    public ModelAndView<Map<String, Object>> editForm(Long id) {
        Optional<QuestionResponse> question = client.getQuestion(id);
        Map<String, Object> model = new HashMap<>();
        if (question.isPresent()) {
            model.put("question", question.get());
            model.put("examTypes", EXAMS);
            model.put("letters", LETTERS);
        } else {
            model.put("error", "Question not found");
        }
        return new ModelAndView<>("question/create", model);
    }

    @Post("/{id}/edit")
    public HttpResponse<?> edit(Long id, @Body @Valid CreateQuestionRequest request) {
        try {
            client.updateQuestion(id, request);
            return HttpResponse.redirect(URI.create("/questions"));
        } catch (Exception e) {
            Map<String, Object> model = new HashMap<>();
            model.put("examTypes", EXAMS);
            model.put("letters", LETTERS);
            model.put("error", "Failed to update question: " + e.getMessage());
            model.put("request", request);
            return HttpResponse.ok(new ModelAndView<>("question/create", model));
        }
    }

    @Post("/{id}/delete")
    public HttpResponse<?> delete(Long id) {
        try {
            client.deleteQuestion(id);
        } catch (Exception ignored) {}
        return HttpResponse.redirect(URI.create("/questions"));
    }
}
