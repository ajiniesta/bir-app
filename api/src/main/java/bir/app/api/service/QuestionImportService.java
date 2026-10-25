package bir.app.api.service;

import bir.app.api.dto.CreateQuestionRequest;
import bir.app.api.dto.QuestionImportResponse;
import bir.app.api.entity.ExamType;
import bir.app.api.repository.ExamTypeRepository;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.inject.Singleton;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Importación masiva de preguntas desde un fichero de texto.
 *
 * <p>Acepta el formato histórico del proyecto: varios objetos JSON concatenados
 * (también un array o un único objeto), con comas finales opcionales. Cada objeto
 * se parsea por separado, de modo que una pregunta con JSON inválido no impide
 * importar el resto. Las preguntas con errores de validación se descartan y se
 * informa de ellas en {@link QuestionImportResponse#errors()}.</p>
 */
@Singleton
public class QuestionImportService {

    private static final int MAX_CATEGORY_LENGTH = 100;
    private static final int MAX_TAG_LENGTH = 100;
    private static final Set<String> ALLOWED_LETTERS = Set.of("A", "B", "C", "D");

    private final QuestionService questionService;
    private final ExamTypeRepository examTypeRepository;
    private final ObjectMapper mapper;

    public QuestionImportService(QuestionService questionService,
                                 ExamTypeRepository examTypeRepository) {
        this.questionService = questionService;
        this.examTypeRepository = examTypeRepository;
        this.mapper = new ObjectMapper(JsonFactory.builder()
                .enable(JsonReadFeature.ALLOW_TRAILING_COMMA)
                .build())
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    public QuestionImportResponse importQuestions(String raw) {
        String content = stripBom(raw);
        if (content.isBlank()) {
            return new QuestionImportResponse(0, 0, 0, List.of("El fichero está vacío."));
        }

        List<String> chunks = splitTopLevelObjects(content);
        if (chunks.isEmpty()) {
            return new QuestionImportResponse(0, 0, 0,
                    List.of("No se ha encontrado ninguna pregunta en el fichero (¿JSON mal formado?)."));
        }

        int total = chunks.size();
        List<String> errors = new ArrayList<>();
        List<Candidate> candidates = new ArrayList<>();

        for (int i = 0; i < total; i++) {
            int position = i + 1;
            ImportQuestion parsed;
            try {
                parsed = mapper.readValue(chunks.get(i), ImportQuestion.class);
            } catch (Exception e) {
                errors.add("Pregunta " + position + ": JSON inválido (" + rootMessage(e) + ").");
                continue;
            }
            if (parsed == null) {
                errors.add("Pregunta " + position + ": JSON inválido.");
                continue;
            }

            List<String> questionErrors = new ArrayList<>();
            CreateQuestionRequest request = validate(parsed, position, questionErrors);
            if (questionErrors.isEmpty() && request != null) {
                candidates.add(new Candidate(position, request));
            } else {
                errors.addAll(questionErrors);
            }
        }

        int imported = 0;
        for (Candidate candidate : candidates) {
            try {
                questionService.create(candidate.request());
                imported++;
            } catch (Exception e) {
                errors.add("Pregunta " + candidate.position()
                        + ": no se pudo guardar (" + rootMessage(e) + ").");
            }
        }

        return new QuestionImportResponse(total, imported, total - imported, errors);
    }

    private CreateQuestionRequest validate(ImportQuestion question, int position, List<String> errors) {
        String prefix = "Pregunta " + position + ": ";

        String text = trimToNull(question.text());
        if (text == null) {
            errors.add(prefix + "el campo 'text' es obligatorio.");
        }

        String category = trimToNull(question.category());
        if (category != null && category.length() > MAX_CATEGORY_LENGTH) {
            errors.add(prefix + "la categoría no puede superar " + MAX_CATEGORY_LENGTH + " caracteres.");
        }

        String tag = trimToNull(question.tag());
        if (tag != null && tag.length() > MAX_TAG_LENGTH) {
            errors.add(prefix + "el tag no puede superar " + MAX_TAG_LENGTH + " caracteres.");
        }

        String explanation = trimToNull(question.explanation());
        Long examTypeId = resolveExamType(question.examType(), prefix, errors);

        List<ImportAnswer> answers = question.answers();
        if (answers == null || answers.isEmpty()) {
            errors.add(prefix + "debe tener al menos una respuesta.");
            answers = List.of();
        }

        List<CreateQuestionRequest.AnswerOptionRequest> options = new ArrayList<>();
        Set<String> letters = new HashSet<>();
        int correct = 0;

        for (int i = 0; i < answers.size(); i++) {
            ImportAnswer answer = answers.get(i);
            String answerPrefix = "Pregunta " + position + ", respuesta " + (i + 1) + ": ";
            if (answer == null) {
                errors.add(answerPrefix + "no es válida.");
                continue;
            }
            String letter = normalizeLetter(answer.letter());
            if (letter == null) {
                errors.add(answerPrefix + "la letra debe ser A, B, C o D.");
                continue;
            }
            if (!letters.add(letter)) {
                errors.add("Pregunta " + position + ": letra repetida '" + letter + "'.");
                continue;
            }
            String optionText = trimToNull(answer.text());
            if (optionText == null) {
                errors.add(answerPrefix + "el texto es obligatorio.");
                continue;
            }
            boolean isCorrect = Boolean.TRUE.equals(answer.isCorrect());
            if (isCorrect) {
                correct++;
            }
            options.add(new CreateQuestionRequest.AnswerOptionRequest(letter, optionText, isCorrect));
        }

        if (correct != 1) {
            errors.add(prefix + "debe haber exactamente una respuesta correcta (hay " + correct + ").");
        }

        if (text == null || examTypeId == null || !errors.isEmpty()) {
            return null;
        }

        options.sort(Comparator.comparing(CreateQuestionRequest.AnswerOptionRequest::letter));
        return new CreateQuestionRequest(text, category, tag, explanation, examTypeId, options);
    }

    /**
     * Interpreta {@code exam_type}: si es numérico se busca por id ("3"); si no,
     * por código ("BIR").
     */
    private Long resolveExamType(String value, String prefix, List<String> errors) {
        String raw = trimToNull(value);
        if (raw == null) {
            errors.add(prefix + "el campo 'exam_type' es obligatorio.");
            return null;
        }

        Optional<ExamType> examType;
        if (raw.matches("\\d+")) {
            try {
                examType = examTypeRepository.findById(Long.parseLong(raw));
            } catch (NumberFormatException e) {
                examType = Optional.empty();
            }
        } else {
            examType = examTypeRepository.findByCode(raw.toUpperCase(Locale.ROOT));
        }

        if (examType.isEmpty()) {
            errors.add(prefix + "tipo de examen no encontrado: " + raw + ".");
            return null;
        }
        return examType.get().getId();
    }

    private static String normalizeLetter(String value) {
        String letter = trimToNull(value);
        if (letter == null) {
            return null;
        }
        String upper = letter.toUpperCase(Locale.ROOT);
        return ALLOWED_LETTERS.contains(upper) ? upper : null;
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String stripBom(String raw) {
        if (raw == null) {
            return "";
        }
        String content = raw;
        if (!content.isEmpty() && content.charAt(0) == '\uFEFF') {
            content = content.substring(1);
        }
        return content.strip();
    }

    /**
     * Trocea el contenido en los objetos JSON de primer nivel. Se ignoran los
     * corchetes de un array contenedor y las comas que separen objetos.
     */
    private static List<String> splitTopLevelObjects(String content) {
        List<String> chunks = new ArrayList<>();
        int depth = 0;
        boolean inString = false;
        boolean escaped = false;
        int start = -1;

        for (int i = 0; i < content.length(); i++) {
            char c = content.charAt(i);
            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (c == '\\') {
                    escaped = true;
                } else if (c == '"') {
                    inString = false;
                }
                continue;
            }
            if (c == '"') {
                inString = true;
            } else if (c == '{') {
                if (depth == 0) {
                    start = i;
                }
                depth++;
            } else if (c == '}' && depth > 0) {
                depth--;
                if (depth == 0 && start >= 0) {
                    chunks.add(content.substring(start, i + 1));
                    start = -1;
                }
            }
        }
        return chunks;
    }

    private static String rootMessage(Throwable throwable) {
        Throwable current = throwable;
        while (current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        String message = current.getMessage();
        if (message == null || message.isBlank()) {
            message = current.getClass().getSimpleName();
        }
        int newline = message.indexOf('\n');
        if (newline > 0) {
            message = message.substring(0, newline);
        }
        return message.length() > 300 ? message.substring(0, 300) + "…" : message;
    }

    private record Candidate(int position, CreateQuestionRequest request) {}

    record ImportQuestion(
        @JsonProperty("exam_type") String examType,
        String category,
        String tag,
        String text,
        String explanation,
        List<ImportAnswer> answers
    ) {}

    record ImportAnswer(
        String letter,
        String text,
        @JsonProperty("is_correct") Boolean isCorrect
    ) {}
}
