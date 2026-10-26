package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

/**
 * Espejo de la petición de importación que espera la API.
 *
 * @param content       objetos JSON de un lote
 * @param startPosition posición (0-based) del primer objeto del lote dentro del
 *                      fichero, para que los errores se numeren globalmente
 */
@Serdeable
public record QuestionImportRequest(String content, Integer startPosition) {

    public QuestionImportRequest(String content) {
        this(content, 0);
    }
}
