package bir.app.api.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/**
 * Estado completo de una partida del modo libre.
 * <p>
 * Por seguridad, las opciones de las preguntas <b>no respondidas</b> no incluyen
 * cuál es la correcta; solo se revela ({@code correctLetter}) una vez respondida.
 */
@Serdeable
public record FreeSessionResponse(
    Long id,
    String examTypeCode,
    String examTypeName,
    String category,
    int totalQuestions,
    int answeredCount,
    int correctCount,
    boolean finished,
    List<Item> items
) {
    @Serdeable
    public record Item(
        int position,
        Long questionId,
        String questionText,
        String category,
        List<Option> options,
        boolean answered,
        String selectedLetter,
        Boolean correct,
        String correctLetter
    ) {}

    @Serdeable
    public record Option(String letter, String text) {}
}
