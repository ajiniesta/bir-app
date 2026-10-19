package bir.app.web.support;

import bir.app.web.client.QuestionApiClient;
import io.micronaut.security.utils.SecurityService;
import jakarta.inject.Singleton;

import java.util.Map;

/**
 * Añade a los modelos de las vistas el enlace a la bandeja de revisión y el
 * contador de propuestas pendientes. El contador se recalcula en cada página
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

    /** Añade {@code canReview} y {@code pendingProposals} al modelo y lo devuelve. */
    public Map<String, Object> addTo(Map<String, Object> model) {
        boolean canReview = canReview();
        model.put("canReview", canReview);
        model.put("pendingProposals", canReview ? pendingCount() : 0L);
        return model;
    }
}
