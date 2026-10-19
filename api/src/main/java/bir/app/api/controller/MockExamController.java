package bir.app.api.controller;

import bir.app.api.dto.CreateMockExamRequest;
import bir.app.api.dto.MockExamAttemptResponse;
import bir.app.api.dto.MockExamAttemptSummaryResponse;
import bir.app.api.dto.MockExamResponse;
import bir.app.api.dto.MockExamSummaryResponse;
import bir.app.api.service.MockExamAttemptService;
import bir.app.api.service.MockExamService;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.*;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.rules.SecurityRule;
import jakarta.validation.Valid;

import java.util.List;

/**
 * Simulacros. La consulta y la resolución están abiertas a cualquier usuario
 * autenticado (filtradas por sus bancos); el CRUD exige ADMIN o CREATOR.
 */
@Controller("/api/mock-exams")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class MockExamController {

    private final MockExamService mockExamService;
    private final MockExamAttemptService attemptService;

    public MockExamController(MockExamService mockExamService,
                              MockExamAttemptService attemptService) {
        this.mockExamService = mockExamService;
        this.attemptService = attemptService;
    }

    /** Simulacros visibles para el usuario autenticado. */
    @Get
    public List<MockExamSummaryResponse> list(Authentication authentication) {
        return mockExamService.listFor(authentication.getName());
    }

    @Get("/{id}")
    public MockExamResponse get(Authentication authentication, Long id) {
        return mockExamService.get(authentication.getName(), id);
    }

    @Post
    @Secured({"ROLE_ADMIN", "ROLE_CREATOR"})
    @Status(HttpStatus.CREATED)
    public MockExamResponse create(Authentication authentication,
                                   @Body @Valid CreateMockExamRequest request) {
        return mockExamService.create(authentication.getName(), request);
    }

    @Put("/{id}")
    @Secured({"ROLE_ADMIN", "ROLE_CREATOR"})
    public MockExamResponse update(Long id, @Body @Valid CreateMockExamRequest request) {
        return mockExamService.update(id, request);
    }

    @Delete("/{id}")
    @Secured({"ROLE_ADMIN", "ROLE_CREATOR"})
    @Status(HttpStatus.NO_CONTENT)
    public void delete(Long id) {
        mockExamService.delete(id);
    }

    // --- Intentos -----------------------------------------------------------

    /** Empieza un intento nuevo (se permiten intentos ilimitados). */
    @Post("/{id}/attempts")
    @Status(HttpStatus.CREATED)
    public MockExamAttemptResponse startAttempt(Authentication authentication, Long id) {
        return attemptService.start(authentication.getName(), id);
    }

    /** Historial de intentos del usuario en este simulacro. */
    @Get("/{id}/attempts")
    public List<MockExamAttemptSummaryResponse> attempts(Authentication authentication, Long id) {
        return attemptService.history(authentication.getName(), id);
    }
}
