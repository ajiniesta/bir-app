package bir.app.api.controller;

import bir.app.api.dto.HealthResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("HealthController")
class HealthControllerTest {

    private final HealthController healthController = new HealthController();

    @Test
    @DisplayName("health returns UP status")
    void healthReturnsUp() {
        HealthResponse response = healthController.health();

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("UP");
    }
}
