package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/** Espejo de {@code bir.app.api.dto.CreateMockExamRequest}. */
@Serdeable
public record CreateMockExamRequest(
    String title,
    String description,
    Long examTypeId,
    List<Long> questionIds
) {}
