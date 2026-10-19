package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

/**
 * Envío de una respuesta de un intento de simulacro.
 * {@code action} vale {@code next} para saltar a la siguiente pregunta sin
 * responder, o cualquier otra cosa para quedarse en la actual.
 */
@Serdeable
public record MockExamAnswerForm(
    Integer position,
    String letter,
    String action
) {
    public boolean goNext() {
        return "next".equalsIgnoreCase(action);
    }

    public boolean hasLetter() {
        return letter != null && !letter.isBlank();
    }
}
