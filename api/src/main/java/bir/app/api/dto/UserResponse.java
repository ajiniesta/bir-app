package bir.app.api.dto;

import bir.app.api.entity.AppUser;
import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record UserResponse(
    Long id,
    String username,
    String displayName,
    String role
) {
    public static UserResponse from(AppUser u) {
        return new UserResponse(u.getId(), u.getUsername(), u.getDisplayName(), u.getRole().name());
    }
}
