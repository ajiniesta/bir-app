package bir.app.api.controller;

import bir.app.api.dto.ChangePasswordRequest;
import bir.app.api.dto.MessageResponse;
import bir.app.api.service.AppUserService;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.annotation.Put;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.rules.SecurityRule;
import jakarta.validation.Valid;

@Controller("/api/profile")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class ProfileController {

    private final AppUserService appUserService;

    public ProfileController(AppUserService appUserService) {
        this.appUserService = appUserService;
    }

    @Put("/password")
    @Produces(MediaType.APPLICATION_JSON)
    public MessageResponse changePassword(Authentication authentication,
                                          @Body @Valid ChangePasswordRequest request) {
        return appUserService.changePassword(authentication.getName(), request);
    }
}
