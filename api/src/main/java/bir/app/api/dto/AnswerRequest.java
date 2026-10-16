package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Serdeable
public record AnswerRequest(
    @NotNull Integer position,
    @NotBlank @Size(min = 1, max = 1) String letter
) {}
