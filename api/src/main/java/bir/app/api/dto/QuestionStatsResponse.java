package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;

/**
 * Estadísticas de respuestas sobre una pregunta concreta:
 * veces respondida y porcentaje de acierto en toda la plataforma y por el usuario autenticado.
 */
@Serdeable
public record QuestionStatsResponse(
        Long questionId,
        ScopeStats platform,
        ScopeStats user
) {

    @Serdeable
    public record ScopeStats(
            long answered,
            long correct,
            long incorrect,
            double accuracy
    ) {
    }
}
