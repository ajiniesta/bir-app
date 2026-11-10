package bir.app.api.service;

import bir.app.api.dto.AdminUserResponse;
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
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
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
}
