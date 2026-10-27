package bir.app.web.support;

import bir.app.web.client.QuestionApiClient;
import io.micronaut.security.utils.SecurityService;
import jakarta.inject.Singleton;

import java.util.Map;

/**
 * Añade a los modelos de las vistas los datos que necesita la barra de
 * navegación común: quién es el usuario (para ocultar enlaces según su rol) y
 * el contador de propuestas pendientes. El contador se recalcula en cada página
 * (una llamada a la API) y solo para ADMIN/CREATOR.
 */
@Singleton
public class NavService {

    private final QuestionApiClient client;
    private final SecurityService securityService;

    public NavService(QuestionApiClient client, SecurityService securityService) {
        this.client = client;
        this.securityService = securityService;
    }

    /** {@code true} si el usuario actual puede revisar propuestas. */
    public boolean canReview() {
        return securityService.hasRole("ROLE_ADMIN") || securityService.hasRole("ROLE_CREATOR");
    }

    public long pendingCount() {
        if (!canReview()) {
            return 0L;
        }
        try {
            return client.pendingProposalCount().pending();
        } catch (Exception e) {
            return 0L;
        }
    }

    /** Nombre a mostrar del usuario actual, o {@code null} si no hay sesión. */
    public String displayName() {
        return securityService.getAuthentication()
                .map(authentication -> {
                    Object name = authentication.getAttributes().get("displayName");
                    return name != null ? name.toString() : authentication.getName();
                })
                .orElse(null);
    }

    /**
     * Añade al modelo lo necesario para pintar la navegación común
     * ({@code authenticated}, {@code isAdmin}, {@code isCreator},
     * {@code displayName}) y la bandeja de revisión ({@code canReview},
     * {@code pendingProposals}), y lo devuelve.
     */
    public Map<String, Object> addTo(Map<String, Object> model) {
        boolean authenticated = securityService.isAuthenticated();
        boolean isAdmin = securityService.hasRole("ROLE_ADMIN");
        boolean isCreator = securityService.hasRole("ROLE_CREATOR");
        boolean canReview = isAdmin || isCreator;

        model.put("authenticated", authenticated);
        model.put("isAdmin", isAdmin);
        model.put("isCreator", isCreator);
        model.put("displayName", displayName());
        model.put("canReview", canReview);
        model.put("pendingProposals", canReview ? pendingCount() : 0L);
        return model;
    }
}
