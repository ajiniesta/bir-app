package bir.app.web.dto;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Modelo del formulario de alta/edición de preguntas. Siempre lleva las cuatro
 * opciones (A-D) en orden, rellenas o vacías.
 */
public record QuestionForm(
    Long id,
    boolean editing,
    String text,
    String category,
    String examTypeCode,
    List<AnswerOptionSlot> slots
) {
    private static final List<String> LETTERS = List.of("A", "B", "C", "D");

    public static QuestionForm empty() {
        return new QuestionForm(null, false, "", "", null, defaultSlots());
    }

    /** Formulario de edición a partir de una pregunta existente. */
    public static QuestionForm of(QuestionResponse question) {
        Map<String, QuestionResponse.AnswerOptionResponse> byLetter = question.answerOptions().stream()
                .filter(o -> o.letter() != null)
                .collect(Collectors.toMap(QuestionResponse.AnswerOptionResponse::letter, o -> o, (a, b) -> a));
        return new QuestionForm(
                question.id(),
                true,
                question.text(),
                question.category(),
                question.examTypeCode(),
                LETTERS.stream().map(letter -> {
                    QuestionResponse.AnswerOptionResponse option = byLetter.get(letter);
                    return new AnswerOptionSlot(
                            letter,
                            option != null ? option.text() : "",
                            option != null && Boolean.TRUE.equals(option.isCorrect()));
                }).toList());
    }

    /** Formulario repoblado tras un error al enviar. */
    public static QuestionForm of(QuestionFormSubmission submission, Long id, List<ExamTypeResponse> examTypes) {
        Map<String, QuestionFormSubmission.AnswerOption> byLetter = submission.answerOptions() == null ? Map.of()
                : submission.answerOptions().stream()
                    .filter(o -> o.letter() != null)
                    .collect(Collectors.toMap(QuestionFormSubmission.AnswerOption::letter, o -> o, (a, b) -> a));
        String code = examTypes.stream()
                .filter(t -> t.id().equals(submission.examTypeId()))
                .map(ExamTypeResponse::code)
                .findFirst()
                .orElse(null);
        return new QuestionForm(
                id,
                id != null,
                submission.text() == null ? "" : submission.text(),
                submission.category() == null ? "" : submission.category(),
                code,
                LETTERS.stream().map(letter -> {
                    QuestionFormSubmission.AnswerOption option = byLetter.get(letter);
                    return new AnswerOptionSlot(
                            letter,
                            option != null && option.text() != null ? option.text() : "",
                            letter.equalsIgnoreCase(submission.correctLetter()));
                }).toList());
    }

    private static List<AnswerOptionSlot> defaultSlots() {
        return LETTERS.stream().map(letter -> new AnswerOptionSlot(letter, "", false)).toList();
    }
}
