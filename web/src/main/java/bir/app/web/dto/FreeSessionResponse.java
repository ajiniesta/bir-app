package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/** Espejo de {@code bir.app.api.dto.FreeSessionResponse}. */
@Serdeable
public record FreeSessionResponse(
    Long id,
    String examTypeCode,
    String examTypeName,
    String category,
    String tag,
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
        String tag,
        String explanation,
        List<Option> options,
        boolean answered,
        String selectedLetter,
        Boolean correct,
        String correctLetter
    ) {}

    @Serdeable
    public record Option(String letter, String text) {}
}
