package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

/**
 * Envío del formulario "proponer respuesta alternativa". Identifica la pregunta
 * y el contexto (posición y letra respondida) además de la propuesta y el motivo.
 */
@Serdeable
public record ProposalForm(
    Long questionId,
    Integer position,
    String selectedLetter,
    String proposedLetter,
    String proposedText,
    String comment
) {}
