package bir.app.web.security;

import io.micronaut.http.HttpHeaders;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.MutableHttpRequest;
import io.micronaut.http.filter.ClientFilterChain;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.utils.SecurityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ApiTokenFilter")
class ApiTokenFilterTest {

    @Mock
    SecurityService securityService;
    @Mock
    Authentication authentication;
    @Mock
    ClientFilterChain chain;

    ApiTokenFilter filter;

    @BeforeEach
    void setUp() {
        filter = new ApiTokenFilter(securityService);
    }

    @Test
    @DisplayName("reenvía el JWT de la sesión como Authorization Bearer")
    void addsBearerHeader() {
        MutableHttpRequest<?> request = HttpRequest.GET("/api/questions");
        when(securityService.getAuthentication()).thenReturn(Optional.of(authentication));
        when(authentication.getAttributes()).thenReturn(Map.of(
                ApiAuthenticationProvider.TOKEN_ATTRIBUTE, "jwt-token"));

        filter.doFilter(request, chain);

        assertThat(request.getHeaders().get(HttpHeaders.AUTHORIZATION)).isEqualTo("Bearer jwt-token");
    }

    @Test
    @DisplayName("no añade cabecera si no hay autenticación")
    void noAuthenticationNoHeader() {
        MutableHttpRequest<?> request = HttpRequest.GET("/api/questions");
        when(securityService.getAuthentication()).thenReturn(Optional.empty());

        filter.doFilter(request, chain);

        assertThat(request.getHeaders().get(HttpHeaders.AUTHORIZATION)).isNull();
    }

    @Test
    @DisplayName("no añade cabecera si la autenticación no tiene token")
    void authenticationWithoutTokenNoHeader() {
        MutableHttpRequest<?> request = HttpRequest.GET("/api/questions");
        when(securityService.getAuthentication()).thenReturn(Optional.of(authentication));
        when(authentication.getAttributes()).thenReturn(Map.of("otro", "valor"));

        filter.doFilter(request, chain);

        assertThat(request.getHeaders().get(HttpHeaders.AUTHORIZATION)).isNull();
    }
}
