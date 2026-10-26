package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;

/**
 * Petición de importación masiva: el texto crudo del fichero de preguntas.
 *
 * @param content       texto con uno o varios objetos JSON de pregunta
 * @param startPosition posición (0-based) del primer objeto dentro del fichero
 *                      completo; sirve para numerar los errores con la posición
 *                      global cuando la web envía el fichero por lotes
 */
@Serdeable
public record QuestionImportRequest(String content, Integer startPosition) {

    public QuestionImportRequest(String content) {
        this(content, 0);
    }
}
