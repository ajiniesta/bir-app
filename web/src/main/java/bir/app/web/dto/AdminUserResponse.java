package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Espejo de {@code bir.app.api.dto.AdminUserResponse}. La API omite las listas
 * vacías al serializar, así que normalizamos {@code allowedExamTypeCodes} a una
 * lista vacía para que las plantillas nunca reciban {@code null}.
 */
@Serdeable
public record AdminUserResponse(
    Long id,
    String username,
    String displayName,
    String role,
    List<String> allowedExamTypeCodes
) {
    public AdminUserResponse {
        if (allowedExamTypeCodes == null) {
            allowedExamTypeCodes = List.of();
        }
    }
}
