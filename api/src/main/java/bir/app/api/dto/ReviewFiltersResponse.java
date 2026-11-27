package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;
import java.util.List;

@Serdeable
public record ReviewFiltersResponse(
    List<String> categories,
    List<String> tags
) {}
