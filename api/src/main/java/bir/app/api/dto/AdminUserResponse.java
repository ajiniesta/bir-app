package bir.app.api.dto;

import bir.app.api.entity.AppUser;
import bir.app.api.entity.ExamType;
import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Vista de un usuario para el panel de administración: rol y bancos asignados.
 */
@Serdeable
public record AdminUserResponse(
    Long id,
    String username,
    String displayName,
    String role,
    List<String> allowedExamTypeCodes
) {
    public static AdminUserResponse from(AppUser u) {
        List<String> codes = u.getAllowedExamTypes().stream()
                .map(ExamType::getCode)
                .sorted()
                .toList();
        return new AdminUserResponse(u.getId(), u.getUsername(), u.getDisplayName(), u.getRole().name(), codes);
    }
}
