package bir.app.api.controller;

import bir.app.api.dto.ChangePasswordRequest;
import bir.app.api.dto.MessageResponse;
import bir.app.api.service.AppUserService;
import io.micronaut.security.authentication.Authentication;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ProfileController")
class ProfileControllerTest {

    @Mock
    AppUserService appUserService;

    @InjectMocks
    ProfileController profileController;

    @Test
    @DisplayName("changePassword delegates to appUserService with authenticated username")
    void changePasswordSuccess() {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("juan");

        ChangePasswordRequest request = new ChangePasswordRequest("oldPass123", "newPass456", "newPass456");
        MessageResponse expected = new MessageResponse("Contraseña modificada correctamente");

        when(appUserService.changePassword("juan", request)).thenReturn(expected);

        MessageResponse result = profileController.changePassword(auth, request);

        assertThat(result).isNotNull();
        assertThat(result.message()).isEqualTo("Contraseña modificada correctamente");
        verify(appUserService).changePassword("juan", request);
    }

    @Test
    @DisplayName("changePassword propagates exception when password change fails in service")
    void changePasswordPropagatesException() {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("juan");

        ChangePasswordRequest request = new ChangePasswordRequest("wrongOld", "newPass456", "newPass456");

        when(appUserService.changePassword("juan", request))
                .thenThrow(new IllegalArgumentException("La contraseña actual no es correcta"));

        assertThatThrownBy(() -> profileController.changePassword(auth, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("La contraseña actual no es correcta");

        verify(appUserService).changePassword("juan", request);
    }
}
