package bir.app.api.controller;

import bir.app.api.dto.RegisterRequest;
import bir.app.api.dto.UserResponse;
import bir.app.api.service.AppUserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthController")
class AuthControllerTest {

    @Mock
    AppUserService appUserService;

    @InjectMocks
    AuthController authController;

    @Test
    @DisplayName("register creates and returns the registered user")
    void registerSuccess() {
        RegisterRequest request = new RegisterRequest("testuser", "password123", "Test User");
        UserResponse response = new UserResponse(10L, "testuser", "Test User", "USER");

        when(appUserService.register(request)).thenReturn(response);

        UserResponse result = authController.register(request);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(10L);
        assertThat(result.username()).isEqualTo("testuser");
        assertThat(result.displayName()).isEqualTo("Test User");
        assertThat(result.role()).isEqualTo("USER");

        verify(appUserService).register(request);
    }

    @Test
    @DisplayName("register propagates exception when username is already taken")
    void registerFailsWhenUsernameExists() {
        RegisterRequest request = new RegisterRequest("existing", "password123", null);

        when(appUserService.register(request))
                .thenThrow(new IllegalArgumentException("El nombre de usuario ya está en uso: existing"));

        assertThatThrownBy(() -> authController.register(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("El nombre de usuario ya está en uso");

        verify(appUserService).register(request);
    }
}
