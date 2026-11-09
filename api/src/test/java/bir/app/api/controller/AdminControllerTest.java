package bir.app.api.controller;

import bir.app.api.dto.AdminUserResponse;
import bir.app.api.dto.UpdateBanksRequest;
import bir.app.api.dto.UpdateRoleRequest;
import bir.app.api.service.AppUserService;
import io.micronaut.security.annotation.Secured;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminController")
class AdminControllerTest {

    @Mock
    AppUserService appUserService;

    @InjectMocks
    AdminController adminController;

    @Test
    @DisplayName("is secured exclusively for ROLE_ADMIN")
    void securedForRoleAdmin() {
        Secured secured = AdminController.class.getAnnotation(Secured.class);
        assertThat(secured).isNotNull();
        assertThat(secured.value()).containsExactly("ROLE_ADMIN");
    }

    @Test
    @DisplayName("users returns the list of users with roles and assigned banks")
    void listUsers() {
        List<AdminUserResponse> expected = List.of(
                new AdminUserResponse(1L, "admin", "Admin", "ADMIN", List.of()),
                new AdminUserResponse(2L, "alumno1", "Alumno Uno", "USER", List.of("BIR", "MIR"))
        );
        when(appUserService.listUsers()).thenReturn(expected);

        List<AdminUserResponse> result = adminController.users();

        assertThat(result).isEqualTo(expected);
        verify(appUserService).listUsers();
    }

    @Test
    @DisplayName("updateRole updates and returns the user role")
    void updateRole() {
        AdminUserResponse expected = new AdminUserResponse(2L, "alumno1", "Alumno Uno", "CREATOR", List.of("BIR"));
        when(appUserService.updateRole(2L, "CREATOR")).thenReturn(expected);

        AdminUserResponse result = adminController.updateRole(2L, new UpdateRoleRequest("CREATOR"));

        assertThat(result).isEqualTo(expected);
        verify(appUserService).updateRole(2L, "CREATOR");
    }

    @Test
    @DisplayName("updateBanks updates and returns the user allowed question banks")
    void updateBanks() {
        List<String> banks = List.of("BIR", "EIR");
        AdminUserResponse expected = new AdminUserResponse(2L, "alumno1", "Alumno Uno", "USER", banks);
        when(appUserService.updateAllowedBanks(2L, banks)).thenReturn(expected);

        AdminUserResponse result = adminController.updateBanks(2L, new UpdateBanksRequest(banks));

        assertThat(result).isEqualTo(expected);
        verify(appUserService).updateAllowedBanks(2L, banks);
    }
}
