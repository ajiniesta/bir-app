package bir.app.web.client;

import bir.app.web.dto.CreateQuestionRequest;
import bir.app.web.dto.QuestionResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.*;
import io.micronaut.http.client.annotation.Client;

import java.util.List;
import java.util.Optional;

@Client("${api.base-url}")
public interface QuestionApiClient {

    @Get("/api/questions")
    List<QuestionResponse> listQuestions();

    @Get("/api/questions/{id}")
    Optional<QuestionResponse> getQuestion(Long id);

    @Post("/api/questions")
    QuestionResponse createQuestion(@Body CreateQuestionRequest request);

    @Put("/api/questions/{id}")
    QuestionResponse updateQuestion(Long id, @Body CreateQuestionRequest request);

    @Delete("/api/questions/{id}")
    HttpStatus deleteQuestion(Long id);

    @Get("/api/questions/filter{?examType}")
    List<QuestionResponse> filterQuestions(String examType);
}
