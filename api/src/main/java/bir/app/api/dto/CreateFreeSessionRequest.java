package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Configuración con la que se inicia una partida del modo libre.
 *
 * @param examTypeCode código del tipo de examen (MIR, EIR...); {@code null} o vacío = todos
 * @param category     categoría a filtrar; {@code null} o vacío = todas
 * @param count        número de preguntas deseado
 */
@Serdeable
public record CreateFreeSessionRequest(
    String examTypeCode,
    String category,
    @NotNull @Min(1) @Max(100) Integer count
) {}
