package bir.app.api.controller;

import bir.app.api.dto.AnswerRequest;
import bir.app.api.dto.CreateReviewSessionRequest;
import bir.app.api.dto.ReviewFiltersResponse;
import bir.app.api.dto.ReviewSessionResponse;
import bir.app.api.dto.ReviewSessionSummaryResponse;
import bir.app.api.service.ReviewSessionService;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.*;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.rules.SecurityRule;
import jakarta.validation.Valid;

import java.util.List;

@Controller("/api/review-sessions")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class ReviewSessionController {

    private final ReviewSessionService reviewSessionService;

    public ReviewSessionController(ReviewSessionService reviewSessionService) {
        this.reviewSessionService = reviewSessionService;
    }

    @Get("/filters{?examType}")
    public ReviewFiltersResponse filters(Authentication authentication,
                                         @Nullable String examType) {
        return reviewSessionService.filters(authentication.getName(), examType);
    }

    @Get
    public List<ReviewSessionSummaryResponse> listActive(Authentication authentication) {
        return reviewSessionService.listActive(authentication.getName());
    }

    @Post
    @Status(HttpStatus.CREATED)
    public ReviewSessionResponse create(Authentication authentication,
                                        @Body CreateReviewSessionRequest request) {
        return reviewSessionService.create(authentication.getName(), request);
    }

    @Get("/{id}")
    public ReviewSessionResponse get(Authentication authentication, Long id) {
        return reviewSessionService.get(authentication.getName(), id);
    }

    @Post("/{id}/answers")
    public ReviewSessionResponse answer(Authentication authentication,
                                        Long id,
                                        @Body @Valid AnswerRequest request) {
        return reviewSessionService.answer(authentication.getName(), id, request);
    }

    @Post("/{id}/finish")
    public ReviewSessionResponse finish(Authentication authentication, Long id) {
        return reviewSessionService.finish(authentication.getName(), id);
    }
}
