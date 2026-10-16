package bir.app.api.controller;

import bir.app.api.dto.RegisterRequest;
import bir.app.api.dto.UserResponse;
import bir.app.api.service.AppUserService;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.Status;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import jakarta.validation.Valid;

@Controller("/api/auth")
public class AuthController {

    private final AppUserService appUserService;

    public AuthController(AppUserService appUserService) {
        this.appUserService = appUserService;
    }

    @Post("/register")
    @Secured(SecurityRule.IS_ANONYMOUS)
    @Status(HttpStatus.CREATED)
    public UserResponse register(@Body @Valid RegisterRequest request) {
        return appUserService.register(request);
    }
}
