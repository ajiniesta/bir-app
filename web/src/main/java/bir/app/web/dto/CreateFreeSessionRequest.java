package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record CreateFreeSessionRequest(
    String examTypeCode,
    String category,
    Integer count
) {}
