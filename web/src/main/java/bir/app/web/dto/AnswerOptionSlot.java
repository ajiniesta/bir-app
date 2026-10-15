package bir.app.web.dto;

/**
 * Una de las cuatro opciones (A-D) de una pregunta en el formulario.
 * La plantilla itera sobre slots, así no necesita indexar listas.
 */
public record AnswerOptionSlot(
    String letter,
    String text,
    boolean correct
) {}
