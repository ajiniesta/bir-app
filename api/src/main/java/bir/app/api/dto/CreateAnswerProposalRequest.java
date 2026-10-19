package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Alta o modificación de una propuesta de respuesta alternativa.
 * <p>
 * Debe indicarse al menos una opción existente ({@code proposedLetter}) o un
 * texto alternativo ({@code proposedText}). El {@code comment} (motivo) es
 * obligatorio. El contexto ({@code source}/{@code sourceId}/{@code position})
 * identifica la partida o el intento donde se vio la pregunta.
 */
@Serdeable
public record CreateAnswerProposalRequest(
    @NotNull Long questionId,
    String proposedLetter,
    String proposedText,
    @NotBlank @Size(max = 2000) String comment,
    @NotBlank String source,
    @NotNull Long sourceId,
    @NotNull Integer position,
    String selectedLetter
) {}
