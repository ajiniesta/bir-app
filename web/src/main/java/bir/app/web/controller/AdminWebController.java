package bir.app.web.controller;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.AdminUserResponse;
import bir.app.web.dto.BanksForm;
import bir.app.web.dto.ExamTypeResponse;
import bir.app.web.dto.RoleForm;
import bir.app.web.dto.UpdateBanksRequest;
import bir.app.web.dto.UpdateRoleRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.micronaut.scheduling.TaskExecutors;
import io.micronaut.scheduling.annotation.ExecuteOn;
import io.micronaut.security.annotation.Secured;
import io.micronaut.views.ModelAndView;

import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Panel de administración: el administrador asigna el rol de cada usuario y los
 * bancos de preguntas a los que puede acceder. Solo {@code ROLE_ADMIN}.
 */
@Controller("/admin")
@Secured("ROLE_ADMIN")
@Produces(MediaType.TEXT_HTML)
@ExecuteOn(TaskExecutors.BLOCKING)
public class AdminWebController {

    private static final List<String> ROLES = List.of("ADMIN", "CREATOR", "USER");

    private final QuestionApiClient client;

    public AdminWebController(QuestionApiClient client) {
        this.client = client;
    }

    @Get("/users")
    public ModelAndView<Map<String, Object>> users(@QueryValue Optional<String> saved) {
        return new ModelAndView<>("admin/users", model(saved.isPresent() ? "Cambios guardados." : null, null));
    }

    @Post("/users/{id}/role")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public HttpResponse<?> updateRole(Long id, @Body RoleForm form) {
        try {
            client.updateUserRole(id, new UpdateRoleRequest(form.role()));
            return HttpResponse.seeOther(URI.create("/admin/users?saved"));
        } catch (Exception e) {
            return HttpResponse.ok(new ModelAndView<>("admin/users",
                    model(null, "No se pudo cambiar el rol: " + rootMessage(e))));
        }
    }

    @Post("/users/{id}/banks")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public HttpResponse<?> updateBanks(Long id, @Body BanksForm form) {
        try {
            List<String> banks = form.banks() == null ? List.of()
                    : form.banks().stream().filter(code -> code != null && !code.isBlank()).toList();
            client.updateUserBanks(id, new UpdateBanksRequest(banks));
            return HttpResponse.seeOther(URI.create("/admin/users?saved"));
        } catch (Exception e) {
            return HttpResponse.ok(new ModelAndView<>("admin/users",
                    model(null, "No se pudieron guardar los bancos: " + rootMessage(e))));
        }
    }

    private Map<String, Object> model(String message, String error) {
        Map<String, Object> model = new HashMap<>();
        model.put("roles", ROLES);
        try {
            List<AdminUserResponse> users = client.listUsers();
            model.put("users", users);
        } catch (Exception e) {
            model.put("error", "No se pudo cargar la lista de usuarios: " + rootMessage(e));
        }
        model.put("examTypes", safeExamTypes());
        if (message != null) {
            model.put("message", message);
        }
        if (error != null) {
            model.put("error", error);
        }
        return model;
    }

    private List<ExamTypeResponse> safeExamTypes() {
        try {
            return client.listExamTypes();
        } catch (Exception e) {
            return List.of();
        }
    }

    private String rootMessage(Throwable e) {
        Throwable cause = e;
        while (cause.getCause() != null && cause.getCause() != cause) {
            cause = cause.getCause();
        }
        return cause.getMessage() == null ? "error inesperado" : cause.getMessage();
    }
}
