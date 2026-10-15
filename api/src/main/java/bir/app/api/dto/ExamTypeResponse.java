package bir.app.api.dto;

import bir.app.api.entity.ExamType;
import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record ExamTypeResponse(
    Long id,
    String code,
    String name
) {
    public static ExamTypeResponse from(ExamType examType) {
        return new ExamTypeResponse(examType.getId(), examType.getCode(), examType.getName());
    }
}
