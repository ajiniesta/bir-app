package bir.app.web.controller;

import bir.app.web.dto.LoginForm;
import bir.app.web.security.ApiAuthenticationProvider;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.micronaut.scheduling.TaskExecutors;
import io.micronaut.scheduling.annotation.ExecuteOn;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.authentication.AuthenticationResponse;
import io.micronaut.security.authentication.UsernamePasswordCredentials;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.security.session.SessionLoginHandler;
import io.micronaut.security.session.SessionLogoutHandler;
import io.micronaut.views.ModelAndView;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Login/logout basados en formulario HTML.
 * <p>
 * No usamos el {@code LoginController}/{@code LogoutController} que aporta
 * micronaut-security porque negocian contenido como JSON y los navegadores
 * envían {@code Accept: text/html} (la ruta no casaría). Aquí se acepta
 * {@code text/html} y se delega en los handlers de sesión de micronaut-security.
 */
@Controller
@Produces(MediaType.TEXT_HTML)
@ExecuteOn(TaskExecutors.BLOCKING)
public class LoginWebController {

    private final ApiAuthenticationProvider authenticationProvider;
    private final SessionLoginHandler loginHandler;
    private final SessionLogoutHandler logoutHandler;

    public LoginWebController(ApiAuthenticationProvider authenticationProvider,
                              SessionLoginHandler loginHandler,
                              SessionLogoutHandler logoutHandler) {
        this.authenticationProvider = authenticationProvider;
        this.loginHandler = loginHandler;
        this.logoutHandler = logoutHandler;
    }

    @Get("/login")
    @Secured(SecurityRule.IS_ANONYMOUS)
    public ModelAndView<Map<String, Object>> login(@QueryValue Optional<String> error,
                                                   @QueryValue Optional<String> registered,
                                                   @QueryValue Optional<String> logout) {
        Map<String, Object> model = new HashMap<>();
        if (error.isPresent()) {
            model.put("error", "Usuario o contraseña incorrectos.");
        }
        if (logout.isPresent()) {
            model.put("message", "Sesión cerrada.");
        }
        if (registered.isPresent()) {
            model.put("message", "Cuenta creada. Ya puedes iniciar sesión.");
        }
        return new ModelAndView<>("login", model);
    }

    @Post("/login")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Produces(MediaType.TEXT_HTML)
    @Secured(SecurityRule.IS_ANONYMOUS)
    @SuppressWarnings("unchecked")
    public HttpResponse<?> doLogin(@Body LoginForm form, HttpRequest<?> request) {
        AuthenticationResponse response = authenticationProvider.authenticate(
                (HttpRequest<Object>) request,
                new UsernamePasswordCredentials(form.username(), form.password()));
        if (response.isAuthenticated()) {
            Authentication authentication = response.getAuthentication().orElseThrow();
            return loginHandler.loginSuccess(authentication, request);
        }
        return HttpResponse.seeOther(URI.create("/login?error"));
    }

    @Post("/logout")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Produces(MediaType.TEXT_HTML)
    @Secured(SecurityRule.IS_ANONYMOUS)
    public HttpResponse<?> doLogout(HttpRequest<?> request) {
        return (HttpResponse<?>) logoutHandler.logout(request);
    }
}
