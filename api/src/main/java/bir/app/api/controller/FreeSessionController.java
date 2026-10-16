package bir.app.api.controller;

import bir.app.api.dto.AnswerRequest;
import bir.app.api.dto.CreateFreeSessionRequest;
import bir.app.api.dto.FreeSessionResponse;
import bir.app.api.service.FreeSessionService;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.*;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.rules.SecurityRule;
import jakarta.validation.Valid;

@Controller("/api/free-sessions")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class FreeSessionController {

    private final FreeSessionService freeSessionService;

    public FreeSessionController(FreeSessionService freeSessionService) {
        this.freeSessionService = freeSessionService;
    }

    @Post
    @Status(HttpStatus.CREATED)
    public FreeSessionResponse create(Authentication authentication,
                                      @Body @Valid CreateFreeSessionRequest request) {
        return freeSessionService.create(authentication.getName(), request);
    }

    @Get("/{id}")
    public FreeSessionResponse get(Authentication authentication, Long id) {
        return freeSessionService.get(authentication.getName(), id);
    }

    @Post("/{id}/answers")
    public FreeSessionResponse answer(Authentication authentication,
                                      Long id,
                                      @Body @Valid AnswerRequest request) {
        return freeSessionService.answer(authentication.getName(), id, request);
    }
}
