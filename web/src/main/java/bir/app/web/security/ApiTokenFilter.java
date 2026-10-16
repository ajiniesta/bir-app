package bir.app.web.security;

import io.micronaut.http.HttpHeaders;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MutableHttpRequest;
import io.micronaut.http.annotation.Filter;
import io.micronaut.http.filter.ClientFilterChain;
import io.micronaut.http.filter.HttpClientFilter;
import io.micronaut.security.utils.SecurityService;
import org.reactivestreams.Publisher;

/**
 * Reenvía el JWT emitido por la API (guardado en los atributos de la
 * autenticación de sesión) en cada llamada saliente hacia la API.
 */
@Filter("/**")
public class ApiTokenFilter implements HttpClientFilter {

    private static final String TOKEN_ATTRIBUTE = "apiToken";

    private final SecurityService securityService;

    public ApiTokenFilter(SecurityService securityService) {
        this.securityService = securityService;
    }

    @Override
    public Publisher<? extends HttpResponse<?>> doFilter(MutableHttpRequest<?> request, ClientFilterChain chain) {
        securityService.getAuthentication().ifPresent(authentication -> {
            Object token = authentication.getAttributes().get(TOKEN_ATTRIBUTE);
            if (token != null) {
                request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
            }
        });
        return chain.proceed(request);
    }
}
