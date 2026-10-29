package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Estadísticas combinadas del modo libre y los simulacros entregados.
 *
 * <p>{@code mine} siempre está presente. {@code global} solo se calcula para
 * ADMIN y CREATOR: para un USER llega como {@code null}, de modo que la
 * actividad del resto de usuarios nunca sale de la API.</p>
 */
@Serdeable
public record StatsOverviewResponse(
    Summary mine,
    Global global
) {
    @Serdeable
    public record CategoryStats(
        String category,
        long answered,
        long correct,
        double accuracy
    ) {}

    @Serdeable
    public record Summary(
        long freeSessions,
        long mockAttempts,
        long answered,
        long correct,
        double accuracy,
        List<CategoryStats> byCategory
    ) {}

    @Serdeable
    public record UserStats(
        String username,
        String displayName,
        long answered,
        long correct,
        double accuracy
    ) {}

    @Serdeable
    public record Global(
        long users,
        long freeSessions,
        long mockAttempts,
        long answered,
        long correct,
        double accuracy,
        List<CategoryStats> byCategory,
        List<UserStats> byUser
    ) {}
}
