package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.ExamTypeResponse;
import bir.app.web.dto.QuestionForm;
import bir.app.web.dto.QuestionFormSubmission;
import bir.app.web.dto.QuestionResponse;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.micronaut.scheduling.TaskExecutors;
import io.micronaut.scheduling.annotation.ExecuteOn;
import io.micronaut.views.ModelAndView;

import java.net.URI;
import java.util.*;

@Controller("/questions")
@ExecuteOn(TaskExecutors.BLOCKING)
public class QuestionWebController {

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
        model.put("examTypes", examTypes());
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
            return HttpResponse.ok(new ModelAndView<>("question/create", model));
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
            return HttpResponse.ok(new ModelAndView<>("question/create", model));
        }
    }

    @Post("/{id}/delete")
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
        return model;
    }

    private List<ExamTypeResponse> examTypes() {
        try {
            return client.listExamTypes();
        } catch (Exception e) {
            return List.of();
        }
    }
}
