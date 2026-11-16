package bir.app.api.controller;

import bir.app.api.dto.HealthResponse;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;

@Controller("/api/health")
public class HealthController {

    private static final HealthResponse UP = new HealthResponse("UP");

    /** Endpoint ligero y público para comprobaciones de salud (healthcheck). */
    @Get
    @Secured(SecurityRule.IS_ANONYMOUS)
    public HealthResponse health() {
        return UP;
    }
}
