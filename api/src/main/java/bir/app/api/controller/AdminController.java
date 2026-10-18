package bir.app.api.controller;

import bir.app.api.dto.AdminUserResponse;
import bir.app.api.dto.UpdateBanksRequest;
import bir.app.api.dto.UpdateRoleRequest;
import bir.app.api.service.AppUserService;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Put;
import io.micronaut.security.annotation.Secured;
import jakarta.validation.Valid;

import java.util.List;

/**
 * Panel de administración: gestionar el rol de cada usuario y los bancos de
 * preguntas a los que puede acceder. Solo accesible para {@code ROLE_ADMIN}.
 */
@Controller("/api/admin")
@Secured("ROLE_ADMIN")
public class AdminController {

    private final AppUserService appUserService;

    public AdminController(AppUserService appUserService) {
        this.appUserService = appUserService;
    }

    @Get("/users")
    public List<AdminUserResponse> users() {
        return appUserService.listUsers();
    }

    @Put("/users/{id}/role")
    public AdminUserResponse updateRole(Long id, @Body @Valid UpdateRoleRequest request) {
        return appUserService.updateRole(id, request.role());
    }

    @Put("/users/{id}/banks")
    public AdminUserResponse updateBanks(Long id, @Body UpdateBanksRequest request) {
        return appUserService.updateAllowedBanks(id, request.examTypeCodes());
    }
}
