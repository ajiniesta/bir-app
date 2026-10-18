package bir.app.api.service;

import bir.app.api.entity.UserRole;
import jakarta.inject.Singleton;

import java.util.Set;

/**
 * Reglas de acceso a los bancos de preguntas. ADMIN y CREATOR tienen acceso
 * global; el rol USER solo a los bancos que le asigne un administrador.
 */
@Singleton
public class AccessControlService {

    private final AppUserService appUserService;

    public AccessControlService(AppUserService appUserService) {
        this.appUserService = appUserService;
    }

    /** {@code true} si el usuario puede acceder a todos los bancos (ADMIN o CREATOR). */
    public boolean hasGlobalBankAccess(String username) {
        return appUserService.role(username) != UserRole.USER;
    }

    public Set<String> allowedBankCodes(String username) {
        return appUserService.allowedBankCodes(username);
    }
}
