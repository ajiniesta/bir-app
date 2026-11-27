package bir.app.api.controller;

import bir.app.api.dto.QuestionPageResponse;
import bir.app.api.dto.QuestionResponse;
import bir.app.api.service.UserQuestionStatusService;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.rules.SecurityRule;

@Controller("/api/question-status")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class UserQuestionStatusController {

    private final UserQuestionStatusService userQuestionStatusService;

    public UserQuestionStatusController(UserQuestionStatusService userQuestionStatusService) {
        this.userQuestionStatusService = userQuestionStatusService;
    }

    @Get("/doubts{?page,size,q,examType,category,tag,status}")
    public QuestionPageResponse listDoubts(Authentication authentication,
                                           @Nullable Integer page,
                                           @Nullable Integer size,
                                           @Nullable String q,
                                           @Nullable String examType,
                                           @Nullable String category,
                                           @Nullable String tag,
                                           @Nullable String status) {
        return userQuestionStatusService.searchDoubtQuestions(
                authentication.getName(), page, size, q, examType, category, tag, status);
    }

    @Get("/doubts/{id}")
    public QuestionResponse getDoubtDetail(Authentication authentication, Long id) {
        return userQuestionStatusService.getDoubtQuestionDetail(authentication.getName(), id);
    }
}
