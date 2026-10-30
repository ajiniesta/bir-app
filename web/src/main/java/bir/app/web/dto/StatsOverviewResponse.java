package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/** Espejo de {@code bir.app.api.dto.StatsOverviewResponse}. */
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
    ) {
        public Summary {
            if (byCategory == null) {
                byCategory = List.of();
            }
        }
    }

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
    ) {
        public Global {
            if (byCategory == null) {
                byCategory = List.of();
            }
            if (byUser == null) {
                byUser = List.of();
            }
        }
    }
}
