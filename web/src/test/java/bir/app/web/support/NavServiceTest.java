package bir.app.web.support;

import bir.app.web.client.QuestionApiClient;
import bir.app.web.dto.ProposalCountResponse;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.utils.SecurityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("NavService")
class NavServiceTest {

    @Mock
    QuestionApiClient client;
    @Mock
    SecurityService securityService;

    NavService service;

    @BeforeEach
    void setUp() {
        service = new NavService(client, securityService);
        // Por defecto no hay sesión; cada test que lo necesite la simula.
        lenient().when(securityService.getAuthentication()).thenReturn(Optional.empty());
    }

    @Test
    @DisplayName("la navegación sabe quién es el usuario y qué rol tiene")
    void addsIdentityForNavbar() {
        Authentication authentication = mock(Authentication.class);
        when(securityService.isAuthenticated()).thenReturn(true);
        when(securityService.hasRole("ROLE_ADMIN")).thenReturn(true);
        when(securityService.getAuthentication()).thenReturn(Optional.of(authentication));
        when(authentication.getAttributes()).thenReturn(Map.of("displayName", "Administración"));

        Map<String, Object> model = service.addTo(new HashMap<>());

        assertThat(model).containsEntry("authenticated", true);
        assertThat(model).containsEntry("isAdmin", true);
        assertThat(model).containsEntry("isCreator", false);
        assertThat(model).containsEntry("displayName", "Administración");
        assertThat(service.displayName()).isEqualTo("Administración");
    }

    @Test
    @DisplayName("sin nombre visible se usa el nombre de usuario")
    void displayNameFallsBackToUsername() {
        Authentication authentication = mock(Authentication.class);
        when(securityService.getAuthentication()).thenReturn(Optional.of(authentication));
        when(authentication.getAttributes()).thenReturn(Map.of());
        when(authentication.getName()).thenReturn("demo");

        assertThat(service.displayName()).isEqualTo("demo");
    }

    @Test
    @DisplayName("ADMIN ve el contador de propuestas pendientes")
    void adminSeesPendingCount() {
        when(securityService.hasRole("ROLE_ADMIN")).thenReturn(true);
        when(client.pendingProposalCount()).thenReturn(new ProposalCountResponse(3));

        Map<String, Object> model = service.addTo(new HashMap<>());

        assertThat(model).containsEntry("canReview", true);
        assertThat(model).containsEntry("pendingProposals", 3L);
        assertThat(service.canReview()).isTrue();
    }

    @Test
    @DisplayName("CREATOR también puede revisar propuestas")
    void creatorCanReview() {
        when(securityService.hasRole("ROLE_ADMIN")).thenReturn(false);
        when(securityService.hasRole("ROLE_CREATOR")).thenReturn(true);
        when(client.pendingProposalCount()).thenReturn(new ProposalCountResponse(1));

        assertThat(service.canReview()).isTrue();
        assertThat(service.pendingCount()).isEqualTo(1L);
    }

    @Test
    @DisplayName("un USER no consulta el contador")
    void userCannotReview() {
        when(securityService.hasRole("ROLE_ADMIN")).thenReturn(false);
        when(securityService.hasRole("ROLE_CREATOR")).thenReturn(false);

        Map<String, Object> model = service.addTo(new HashMap<>());

        assertThat(model).containsEntry("canReview", false);
        assertThat(model).containsEntry("pendingProposals", 0L);
        verify(client, never()).pendingProposalCount();
    }

    @Test
    @DisplayName("si la API falla, el contador vale cero")
    void apiFailureReturnsZero() {
        when(securityService.hasRole("ROLE_ADMIN")).thenReturn(true);
        when(client.pendingProposalCount()).thenThrow(new IllegalStateException("API caída"));

        assertThat(service.pendingCount()).isZero();
    }
}
