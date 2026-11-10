package bir.app.api.service;

import bir.app.api.dto.AdminUserResponse;
import bir.app.api.dto.ChangePasswordRequest;
import bir.app.api.dto.MessageResponse;
import bir.app.api.entity.AppUser;
import bir.app.api.entity.ExamType;
import bir.app.api.entity.UserRole;
import bir.app.api.repository.AppUserRepository;
import bir.app.api.repository.ExamTypeRepository;
import bir.app.api.security.BcryptPasswordEncoder;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AppUserService")
class AppUserServiceTest {

    @Mock
    AppUserRepository userRepository;

    @Mock
    ExamTypeRepository examTypeRepository;

    @Mock
    BcryptPasswordEncoder passwordEncoder;

    @InjectMocks
    AppUserService appUserService;

    @Test
    @DisplayName("listUsers returns all users with their roles and sorted allowed exam type codes")
    void listUsersReturnsAllUsersWithBanks() {
        ExamType bir = new ExamType();
        bir.setId(1L);
        bir.setCode("BIR");
        bir.setName("Biólogo Interno Residente");

        ExamType mir = new ExamType();
        mir.setId(2L);
        mir.setCode("MIR");
        mir.setName("Médico Interno Residente");

        AppUser admin = new AppUser();
        admin.setId(1L);
        admin.setUsername("admin");
        admin.setDisplayName("Administrador");
        admin.setRole(UserRole.ADMIN);

        AppUser user = new AppUser();
        user.setId(2L);
        user.setUsername("antonio");
        user.setDisplayName("Antonio");
        user.setRole(UserRole.USER);
        user.setAllowedExamTypes(Set.of(mir, bir));

        when(userRepository.findAllWithBanks()).thenReturn(List.of(admin, user));

        List<AdminUserResponse> result = appUserService.listUsers();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).username()).isEqualTo("admin");
        assertThat(result.get(0).role()).isEqualTo("ADMIN");
        assertThat(result.get(0).allowedExamTypeCodes()).isEmpty();

        assertThat(result.get(1).username()).isEqualTo("antonio");
        assertThat(result.get(1).role()).isEqualTo("USER");
        assertThat(result.get(1).allowedExamTypeCodes()).containsExactly("BIR", "MIR");

        verify(userRepository).findAllWithBanks();
    }

    @Test
    @DisplayName("changePassword updates password hash when current password is valid and new password conforms")
    void changePasswordSuccess() {
        AppUser user = new AppUser();
        user.setId(5L);
        user.setUsername("juan");
        user.setPasswordHash("hashed_old");

        when(userRepository.findByUsername("juan")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldPass123", "hashed_old")).thenReturn(true);
        when(passwordEncoder.encode("newPass456")).thenReturn("hashed_new");
        when(userRepository.save(user)).thenReturn(user);

        ChangePasswordRequest request = new ChangePasswordRequest("oldPass123", "newPass456", "newPass456");
        MessageResponse response = appUserService.changePassword("juan", request);

        assertThat(response).isNotNull();
        assertThat(response.message()).isEqualTo("Contraseña modificada correctamente");
        assertThat(user.getPasswordHash()).isEqualTo("hashed_new");
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("changePassword fails when current password does not match")
    void changePasswordFailsWhenCurrentPasswordWrong() {
        AppUser user = new AppUser();
        user.setId(5L);
        user.setUsername("juan");
        user.setPasswordHash("hashed_old");

        when(userRepository.findByUsername("juan")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongPass", "hashed_old")).thenReturn(false);

        ChangePasswordRequest request = new ChangePasswordRequest("wrongPass", "newPass456", "newPass456");

        assertThatThrownBy(() -> appUserService.changePassword("juan", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("La contraseña actual no es correcta");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("changePassword fails when new password and confirm password do not match")
    void changePasswordFailsWhenConfirmationMismatch() {
        AppUser user = new AppUser();
        user.setId(5L);
        user.setUsername("juan");
        user.setPasswordHash("hashed_old");

        when(userRepository.findByUsername("juan")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldPass123", "hashed_old")).thenReturn(true);

        ChangePasswordRequest request = new ChangePasswordRequest("oldPass123", "newPass456", "differentPass");

        assertThatThrownBy(() -> appUserService.changePassword("juan", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("La confirmación de la nueva contraseña no coincide");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("changePassword fails when new password is identical to current password")
    void changePasswordFailsWhenNewPasswordSameAsCurrent() {
        AppUser user = new AppUser();
        user.setId(5L);
        user.setUsername("juan");
        user.setPasswordHash("hashed_old");

        when(userRepository.findByUsername("juan")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("samePassword", "hashed_old")).thenReturn(true);

        ChangePasswordRequest request = new ChangePasswordRequest("samePassword", "samePassword", "samePassword");

        assertThatThrownBy(() -> appUserService.changePassword("juan", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("La nueva contraseña no puede ser igual a la actual");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("changePassword fails when new password is shorter than 6 characters")
    void changePasswordFailsWhenNewPasswordTooShort() {
        AppUser user = new AppUser();
        user.setId(5L);
        user.setUsername("juan");
        user.setPasswordHash("hashed_old");

        when(userRepository.findByUsername("juan")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldPass123", "hashed_old")).thenReturn(true);

        ChangePasswordRequest request = new ChangePasswordRequest("oldPass123", "12345", "12345");

        assertThatThrownBy(() -> appUserService.changePassword("juan", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("La nueva contraseña debe tener al menos 6 caracteres");

        verify(userRepository, never()).save(any());
    }
}
