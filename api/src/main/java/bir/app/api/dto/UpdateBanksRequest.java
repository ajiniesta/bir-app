package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Reemplaza el conjunto de bancos de preguntas (códigos de tipo de examen)
 * asignados a un usuario. {@code null} o lista vacía = ningún banco.
 */
@Serdeable
public record UpdateBanksRequest(
    List<String> examTypeCodes
) {}
