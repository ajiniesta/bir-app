package bir.app.web.client;

import bir.app.web.dto.AnswerRequest;
import bir.app.web.dto.CreateFreeSessionRequest;
import bir.app.web.dto.CreateQuestionRequest;
import bir.app.web.dto.DashboardStatsResponse;
import bir.app.web.dto.ExamTypeResponse;
import bir.app.web.dto.FreeSessionResponse;
import bir.app.web.dto.LoginRequest;
import bir.app.web.dto.LoginResponse;
import bir.app.web.dto.QuestionResponse;
import bir.app.web.dto.QuizStatsResponse;
import bir.app.web.dto.RegisterRequest;
import bir.app.web.dto.UserResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.*;
import io.micronaut.http.client.annotation.Client;

import java.util.List;
import java.util.Optional;

@Client("${api.base-url}")
public interface QuestionApiClient {

    // --- Autenticación ------------------------------------------------------

    /** Endpoint {@code /login} que aporta micronaut-security en la API. */
    @Post("/login")
    LoginResponse login(@Body LoginRequest request);

    @Post("/api/auth/register")
    UserResponse register(@Body RegisterRequest request);

    // --- Banco de preguntas -------------------------------------------------

    @Get("/api/questions")
    List<QuestionResponse> listQuestions();

    @Get("/api/questions/categories")
    List<String> listCategories();

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

    // --- Estadísticas -------------------------------------------------------

    @Get("/api/stats")
    DashboardStatsResponse stats();

    @Get("/api/stats/quiz")
    QuizStatsResponse quizStats();

    @Get("/api/exam-types")
    List<ExamTypeResponse> listExamTypes();

    // --- Modo libre ---------------------------------------------------------

    @Post("/api/free-sessions")
    FreeSessionResponse createFreeSession(@Body CreateFreeSessionRequest request);

    @Get("/api/free-sessions/{id}")
    FreeSessionResponse getFreeSession(Long id);

    @Post("/api/free-sessions/{id}/answers")
    FreeSessionResponse answer(Long id, @Body AnswerRequest request);
}
