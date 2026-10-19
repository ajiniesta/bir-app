package bir.app.api.service;

import bir.app.api.entity.ExamType;
import bir.app.api.entity.UserRole;
import bir.app.api.exception.ForbiddenException;
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

    /**
     * Comprueba que el usuario puede acceder al banco indicado. Un USER sin
     * bancos asignados recibe un mensaje específico.
     */
    public void requireBankAccess(String username, ExamType examType) {
        if (hasGlobalBankAccess(username)) {
            return;
        }
        Set<String> allowed = allowedBankCodes(username);
        if (allowed.isEmpty()) {
            throw new ForbiddenException(
                    "No tienes ningún banco de preguntas asignado. Contacta con un administrador.");
        }
        if (examType == null || !allowed.contains(examType.getCode())) {
            throw new ForbiddenException(
                    "No tienes acceso al banco de preguntas: "
                            + (examType == null ? "desconocido" : examType.getCode()));
        }
    }
}
