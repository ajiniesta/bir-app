package bir.app.api.security;

import bir.app.api.entity.AppUser;
import bir.app.api.repository.AppUserRepository;
import io.micronaut.http.HttpRequest;
import io.micronaut.security.authentication.AuthenticationFailureReason;
import io.micronaut.security.authentication.AuthenticationRequest;
import io.micronaut.security.authentication.AuthenticationResponse;
import io.micronaut.security.authentication.provider.HttpRequestAuthenticationProvider;
import jakarta.inject.Singleton;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Valida usuario/contraseña contra la tabla {@code app_user}. El usuario demo
 * sembrado por migración también pasa por aquí.
 */
@Singleton
public class AppUserAuthenticationProvider implements HttpRequestAuthenticationProvider<Object> {

    private final AppUserRepository userRepository;
    private final BcryptPasswordEncoder passwordEncoder;

    public AppUserAuthenticationProvider(AppUserRepository userRepository,
                                         BcryptPasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public AuthenticationResponse authenticate(HttpRequest<Object> requestContext,
                                              AuthenticationRequest<String, String> authenticationRequest) {
        String username = authenticationRequest.getIdentity();
        String password = authenticationRequest.getSecret();

        Optional<AppUser> user = userRepository.findByUsername(username);
        if (user.isPresent() && passwordEncoder.matches(password, user.get().getPasswordHash())) {
            AppUser u = user.get();
            return AuthenticationResponse.success(
                    u.getUsername(),
                    List.of(u.getRole().authority()),
                    Map.of("uid", u.getId(),
                           "role", u.getRole().name(),
                           "displayName", u.getDisplayName() == null ? u.getUsername() : u.getDisplayName()));
        }
        // Mismo motivo tanto si el usuario no existe como si la contraseña falla,
        // para no revelar qué usuarios existen.
        return AuthenticationResponse.failure(AuthenticationFailureReason.CREDENTIALS_DO_NOT_MATCH);
    }
}
