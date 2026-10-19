package bir.app.web.client;

import bir.app.web.dto.AdminUserResponse;
import bir.app.web.dto.AnswerProposalResponse;
import bir.app.web.dto.AnswerRequest;
import bir.app.web.dto.CreateAnswerProposalRequest;
import bir.app.web.dto.CreateFreeSessionRequest;
import bir.app.web.dto.CreateMockExamRequest;
import bir.app.web.dto.CreateQuestionRequest;
import bir.app.web.dto.DashboardStatsResponse;
import bir.app.web.dto.ExamTypeResponse;
import bir.app.web.dto.FreeSessionResponse;
import bir.app.web.dto.LoginRequest;
import bir.app.web.dto.LoginResponse;
import bir.app.web.dto.MockExamAttemptResponse;
import bir.app.web.dto.MockExamAttemptSummaryResponse;
import bir.app.web.dto.MockExamResponse;
import bir.app.web.dto.MockExamStatsResponse;
import bir.app.web.dto.MockExamSummaryResponse;
import bir.app.web.dto.MyProposalResponse;
import bir.app.web.dto.ProposalCountResponse;
import bir.app.web.dto.QuestionImportRequest;
import bir.app.web.dto.QuestionImportResponse;
import bir.app.web.dto.QuestionResponse;
import bir.app.web.dto.QuizStatsResponse;
import bir.app.web.dto.RegisterRequest;
import bir.app.web.dto.ReviewProposalRequest;
import bir.app.web.dto.UpdateBanksRequest;
import bir.app.web.dto.UpdateRoleRequest;
import bir.app.web.dto.UserResponse;
import io.micronaut.core.annotation.Nullable;
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

    /** Importa el texto crudo de un fichero de preguntas (ADMIN/CREATOR). */
    @Post("/api/questions/import")
    QuestionImportResponse importQuestions(@Body QuestionImportRequest request);

    @Put("/api/questions/{id}")
    QuestionResponse updateQuestion(Long id, @Body CreateQuestionRequest request);

    @Delete("/api/questions/{id}")
    HttpStatus deleteQuestion(Long id);

    @Get("/api/questions/filter{?examType}")
    List<QuestionResponse> filterQuestions(String examType);

    // --- Estadísticas -------------------------------------------------------

    @Get("/api/stats")
    DashboardStatsResponse stats();

    /** Contadores de los bancos visibles para el usuario autenticado. */
    @Get("/api/stats/banks")
    DashboardStatsResponse bankStats();

    @Get("/api/stats/quiz")
    QuizStatsResponse quizStats();

    /** Estadísticas de simulacros del usuario autenticado. */
    @Get("/api/stats/mock-exams")
    MockExamStatsResponse mockExamStats();

    @Get("/api/exam-types")
    List<ExamTypeResponse> listExamTypes();

    // --- Modo libre ---------------------------------------------------------

    @Post("/api/free-sessions")
    FreeSessionResponse createFreeSession(@Body CreateFreeSessionRequest request);

    @Get("/api/free-sessions/{id}")
    FreeSessionResponse getFreeSession(Long id);

    @Post("/api/free-sessions/{id}/answers")
    FreeSessionResponse answer(Long id, @Body AnswerRequest request);

    // --- Simulacros ---------------------------------------------------------

    @Get("/api/mock-exams")
    List<MockExamSummaryResponse> listMockExams();

    @Get("/api/mock-exams/{id}")
    MockExamResponse getMockExam(Long id);

    @Post("/api/mock-exams")
    MockExamResponse createMockExam(@Body CreateMockExamRequest request);

    @Put("/api/mock-exams/{id}")
    MockExamResponse updateMockExam(Long id, @Body CreateMockExamRequest request);

    @Delete("/api/mock-exams/{id}")
    HttpStatus deleteMockExam(Long id);

    @Post("/api/mock-exams/{id}/attempts")
    MockExamAttemptResponse startMockExamAttempt(Long id);

    @Get("/api/mock-exams/{id}/attempts")
    List<MockExamAttemptSummaryResponse> listMockExamAttempts(Long id);

    @Get("/api/mock-exam-attempts/{id}")
    MockExamAttemptResponse getMockExamAttempt(Long id);

    @Post("/api/mock-exam-attempts/{id}/answers")
    MockExamAttemptResponse answerMockExamAttempt(Long id, @Body AnswerRequest request);

    @Post("/api/mock-exam-attempts/{id}/finish")
    MockExamAttemptResponse finishMockExamAttempt(Long id);

    @Get("/api/mock-exam-attempts/{id}/result")
    MockExamAttemptResponse mockExamAttemptResult(Long id);

    // --- Propuestas de respuesta / revisión ---------------------------------

    /** Crea o actualiza mi propuesta para una pregunta (usuario autenticado). */
    @Post("/api/proposals")
    AnswerProposalResponse proposeAnswer(@Body CreateAnswerProposalRequest request);

    /** Mis propuestas para un conjunto de preguntas (estado en la UI). */
    @Get("/api/proposals/mine")
    List<MyProposalResponse> myProposals(@QueryValue("questionIds") List<Long> questionIds);

    /** Bandeja de revisión (ADMIN/CREATOR). {@code status} vacío = todas. */
    @Get("/api/proposals{?status,examType}")
    List<AnswerProposalResponse> listAnswerProposals(@Nullable String status, @Nullable String examType);

    /** Número de propuestas pendientes (contador del menú). */
    @Get("/api/proposals/pending-count")
    ProposalCountResponse pendingProposalCount();

    /** Veredicto: aceptar o rechazar una propuesta (ADMIN/CREATOR). */
    @Post("/api/proposals/{id}/review")
    AnswerProposalResponse reviewAnswerProposal(Long id, @Body ReviewProposalRequest request);

    /** Aplica la propuesta a la pregunta (ADMIN/CREATOR). */
    @Post("/api/proposals/{id}/apply")
    AnswerProposalResponse applyAnswerProposal(Long id);

    // --- Administración (solo ROLE_ADMIN) -----------------------------------

    @Get("/api/admin/users")
    List<AdminUserResponse> listUsers();

    @Put("/api/admin/users/{id}/role")
    AdminUserResponse updateUserRole(Long id, @Body UpdateRoleRequest request);

    @Put("/api/admin/users/{id}/banks")
    AdminUserResponse updateUserBanks(Long id, @Body UpdateBanksRequest request);
}
