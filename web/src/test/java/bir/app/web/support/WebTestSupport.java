package bir.app.web.support;

import bir.app.web.dto.LoginRequest;
import bir.app.web.dto.LoginResponse;
import io.micronaut.http.HttpHeaders;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.BlockingHttpClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Utilidades compartidas por los tests HTTP del módulo web: login con sesión,
 * construcción de formularios y extracción de la cookie.
 */
public final class WebTestSupport {

    public static final String ADMIN_PASSWORD = "admin1234";

    private WebTestSupport() {
    }

    /** Stub del {@code /login} de la API: devuelve un JWT con ROLE_ADMIN. */
    public static void stubAdminLogin(bir.app.web.client.QuestionApiClient client) {
        when(client.login(any(LoginRequest.class)))
                .thenReturn(new LoginResponse("jwt-test", "bearer", 3600, "admin",
                        List.of("ROLE_ADMIN")));
    }

    /** Hace login real en la app web y devuelve la cookie de sesión. */
    public static String login(BlockingHttpClient client) {
        HttpResponse<?> response = client.exchange(
                HttpRequest.POST("/login", "username=admin&password=" + ADMIN_PASSWORD)
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .accept(MediaType.TEXT_HTML));

        assertThat(response.getStatus().getCode())
                .withFailMessage("Login devolvió %s. Cuerpo: %s", response.getStatus(), response.getBody())
                .isEqualTo(303);
        return sessionCookie(response);
    }

    public static String sessionCookie(HttpResponse<?> response) {
        for (String header : response.getHeaders().getAll(HttpHeaders.SET_COOKIE)) {
            if (header.startsWith("SESSION=")) {
                int semicolon = header.indexOf(';');
                return semicolon < 0 ? header : header.substring(0, semicolon);
            }
        }
        throw new AssertionError("La respuesta de login no incluye cookie SESSION: "
                + response.getHeaders().getAll(HttpHeaders.SET_COOKIE));
    }

    public static HttpRequest<?> get(String uri, String cookie) {
        return HttpRequest.GET(uri)
                .header(HttpHeaders.COOKIE, cookie)
                .accept(MediaType.TEXT_HTML);
    }

    public static HttpRequest<?> postForm(String uri, String cookie, String body) {
        return HttpRequest.POST(uri, body)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .accept(MediaType.TEXT_HTML)
                .header(HttpHeaders.COOKIE, cookie);
    }

    /** Formulario POST cuyo consumidor espera JSON (barra de progreso). */
    public static HttpRequest<?> postJsonForm(String uri, String cookie, String body) {
        return HttpRequest.POST(uri, body)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .accept(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.COOKIE, cookie);
    }

    public static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
