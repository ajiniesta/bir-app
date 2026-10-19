package bir.app.api.controller;

import bir.app.api.dto.AnswerProposalResponse;
import bir.app.api.dto.CreateAnswerProposalRequest;
import bir.app.api.dto.MyProposalResponse;
import bir.app.api.dto.ProposalCountResponse;
import bir.app.api.dto.ReviewProposalRequest;
import bir.app.api.service.AnswerProposalService;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.*;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.rules.SecurityRule;
import jakarta.validation.Valid;

import java.util.List;

/**
 * Propuestas de respuesta alternativa. El alta y la consulta de las propias
 * están abiertas a cualquier usuario autenticado; la bandeja de revisión, el
 * contador y las acciones de revisar/aplicar son solo para ADMIN/CREATOR.
 */
@Controller("/api/proposals")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class AnswerProposalController {

    private final AnswerProposalService proposalService;

    public AnswerProposalController(AnswerProposalService proposalService) {
        this.proposalService = proposalService;
    }

    @Post
    @Status(HttpStatus.CREATED)
    public AnswerProposalResponse create(Authentication authentication,
                                         @Body @Valid CreateAnswerProposalRequest request) {
        return proposalService.propose(authentication.getName(), request);
    }

    @Get("/mine")
    public List<MyProposalResponse> mine(Authentication authentication,
                                         @Nullable @QueryValue("questionIds") List<Long> questionIds) {
        return proposalService.mine(authentication.getName(), questionIds);
    }

    @Get
    @Secured({"ROLE_ADMIN", "ROLE_CREATOR"})
    public List<AnswerProposalResponse> list(@Nullable @QueryValue String status,
                                             @Nullable @QueryValue String examType) {
        return proposalService.listForReview(status, examType);
    }

    @Get("/pending-count")
    @Secured({"ROLE_ADMIN", "ROLE_CREATOR"})
    public ProposalCountResponse pendingCount() {
        return new ProposalCountResponse(proposalService.pendingCount());
    }

    @Post("/{id}/review")
    @Secured({"ROLE_ADMIN", "ROLE_CREATOR"})
    public AnswerProposalResponse review(Authentication authentication, Long id,
                                         @Body @Valid ReviewProposalRequest request) {
        return proposalService.review(authentication.getName(), id, request);
    }

    @Post("/{id}/apply")
    @Secured({"ROLE_ADMIN", "ROLE_CREATOR"})
    public AnswerProposalResponse apply(Authentication authentication, Long id) {
        return proposalService.apply(authentication.getName(), id);
    }
}
