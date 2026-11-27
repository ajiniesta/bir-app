package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;
import java.util.List;

@Serdeable
public record CreateReviewSessionRequest(
    String examTypeCode,
    List<String> categories,
    List<String> tags
) {}
