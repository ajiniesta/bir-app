package bir.app.api.controller;

import bir.app.api.dto.AnswerRequest;
import bir.app.api.dto.MockExamAttemptResponse;
import bir.app.api.service.MockExamAttemptService;
import io.micronaut.http.annotation.*;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.rules.SecurityRule;
import jakarta.validation.Valid;

/**
 * Resolución de un intento de simulacro. Solo el dueño del intento puede
 * consultarlo o responderlo.
 */
@Controller("/api/mock-exam-attempts")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class MockExamAttemptController {

    private final MockExamAttemptService attemptService;

    public MockExamAttemptController(MockExamAttemptService attemptService) {
        this.attemptService = attemptService;
    }

    @Get("/{id}")
    public MockExamAttemptResponse get(Authentication authentication, Long id) {
        return attemptService.get(authentication.getName(), id);
    }

    @Post("/{id}/answers")
    public MockExamAttemptResponse answer(Authentication authentication,
                                          Long id,
                                          @Body @Valid AnswerRequest request) {
        return attemptService.answer(authentication.getName(), id, request);
    }

    @Post("/{id}/finish")
    public MockExamAttemptResponse finish(Authentication authentication, Long id) {
        return attemptService.finish(authentication.getName(), id);
    }

    @Get("/{id}/result")
    public MockExamAttemptResponse result(Authentication authentication, Long id) {
        return attemptService.result(authentication.getName(), id);
    }
}
