package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Datos para crear o actualizar un simulacro. Todas las preguntas deben
 * pertenecer al tipo de examen indicado y el orden de {@code questionIds} es el
 * orden en que se mostrarán.
 */
@Serdeable
public record CreateMockExamRequest(
    @NotBlank @Size(max = 200) String title,
    String description,
    @NotNull Long examTypeId,
    @NotEmpty List<Long> questionIds
) {}
