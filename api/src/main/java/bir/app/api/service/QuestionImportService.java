package bir.app.api.service;

import bir.app.api.dto.CreateQuestionRequest;
import bir.app.api.dto.QuestionImportResponse;
import bir.app.api.entity.ExamType;
import bir.app.api.repository.ExamTypeRepository;
import bir.app.api.repository.QuestionRepository;
import bir.app.api.support.JsonObjectSplitter;
import bir.app.api.support.QuestionTextNormalizer;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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
 *
 * <p>Las preguntas cuyo enunciado ya existe en el mismo banco (o se repite dentro
 * del propio fichero) no se vuelven a guardar: se cuentan en
 * {@link QuestionImportResponse#duplicates()}. Eso hace que reenviar un fichero
 * que se cortó a medias complete lo que faltaba sin crear duplicados.</p>
 */
@Singleton
public class QuestionImportService {

    private static final Logger LOG = LoggerFactory.getLogger(QuestionImportService.class);

    private static final int MAX_CATEGORY_LENGTH = 100;
    private static final int MAX_TAG_LENGTH = 100;
    private static final Set<String> ALLOWED_LETTERS = Set.of("A", "B", "C", "D");
    /** Cada cuántas preguntas se deja una traza del avance en el log. */
    private static final int PROGRESS_LOG_EVERY = 100;

    private final QuestionService questionService;
    private final ExamTypeRepository examTypeRepository;
    private final QuestionRepository questionRepository;
    private final ObjectMapper mapper;

    public QuestionImportService(QuestionService questionService,
                                 ExamTypeRepository examTypeRepository,
                                 QuestionRepository questionRepository) {
        this.questionService = questionService;
        this.examTypeRepository = examTypeRepository;
        this.questionRepository = questionRepository;
        this.mapper = new ObjectMapper(JsonFactory.builder()
                .enable(JsonReadFeature.ALLOW_TRAILING_COMMA)
                .build())
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    public QuestionImportResponse importQuestions(String raw) {
        return importQuestions(raw, 0);
    }

    /**
     * Importa un trozo del fichero. {@code startPosition} es la posición del
     * primer objeto dentro del fichero completo (la web envía el contenido por
     * lotes), de modo que los errores se numeran con la posición global.
     */
    public QuestionImportResponse importQuestions(String raw, int startPosition) {
        int offset = Math.max(0, startPosition);
        String content = stripBom(raw);
        if (content.isBlank()) {
            return new QuestionImportResponse(0, 0, 0, 0, List.of("El fichero está vacío."));
        }

        List<String> chunks = JsonObjectSplitter.split(content);
        if (chunks.isEmpty()) {
            return new QuestionImportResponse(0, 0, 0, 0,
                    List.of("No se ha encontrado ninguna pregunta en el fichero (¿JSON mal formado?)."));
        }

        int total = chunks.size();
        List<String> errors = new ArrayList<>();
        List<Candidate> candidates = new ArrayList<>();
        Map<String, Optional<Long>> examTypeCache = new HashMap<>();

        for (int i = 0; i < total; i++) {
            int position = offset + i + 1;
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
            CreateQuestionRequest request = validate(parsed, position, questionErrors, examTypeCache);
            if (questionErrors.isEmpty() && request != null) {
                candidates.add(new Candidate(position, request));
            } else {
                errors.addAll(questionErrors);
            }
        }

        Map<Long, Set<String>> existingTexts = loadExistingTexts(candidates);

        int imported = 0;
        int duplicates = 0;
        int processed = 0;

        for (Candidate candidate : candidates) {
            Set<String> texts = existingTexts.computeIfAbsent(
                    candidate.request().examTypeId(), id -> new HashSet<>());
            String key = normalizeText(candidate.request().text());
            if (texts.contains(key)) {
                duplicates++;
            } else {
                texts.add(key);
                try {
                    questionService.create(candidate.request());
                    imported++;
                } catch (Exception e) {
                    texts.remove(key);
                    errors.add("Pregunta " + candidate.position()
                            + ": no se pudo guardar (" + rootMessage(e) + ").");
                }
            }
            processed++;
            if (processed % PROGRESS_LOG_EVERY == 0) {
                LOG.info("Importación de preguntas: {} de {} procesadas ({} importadas, {} duplicadas)",
                        processed, candidates.size(), imported, duplicates);
            }
        }

        int skipped = total - imported - duplicates;
        LOG.info("Importación de preguntas terminada: {} detectadas, {} importadas, {} duplicadas, {} descartadas",
                total, imported, duplicates, skipped);
        return new QuestionImportResponse(total, imported, skipped, duplicates, errors);
    }

    /**
     * Enunciados ya guardados en cada banco implicado, normalizados para poder
     * compararlos. Se carga una sola vez por banco y llamada (no por pregunta).
     */
    private Map<Long, Set<String>> loadExistingTexts(List<Candidate> candidates) {
        Set<Long> examTypeIds = new LinkedHashSet<>();
        for (Candidate candidate : candidates) {
            examTypeIds.add(candidate.request().examTypeId());
        }
        Map<Long, Set<String>> existing = new HashMap<>();
        for (Long examTypeId : examTypeIds) {
            Set<String> texts = new HashSet<>();
            for (String text : questionRepository.findTextsByExamTypeId(examTypeId)) {
                texts.add(normalizeText(text));
            }
            existing.put(examTypeId, texts);
        }
        return existing;
    }

    private CreateQuestionRequest validate(ImportQuestion question,
                                           int position,
                                           List<String> errors,
                                           Map<String, Optional<Long>> examTypeCache) {
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
        Long examTypeId = resolveExamType(question.examType(), prefix, errors, examTypeCache);

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
     * por código ("BIR"). El resultado se cachea durante la importación para no
     * repetir la consulta en cada pregunta.
     */
    private Long resolveExamType(String value,
                                 String prefix,
                                 List<String> errors,
                                 Map<String, Optional<Long>> examTypeCache) {
        String raw = trimToNull(value);
        if (raw == null) {
            errors.add(prefix + "el campo 'exam_type' es obligatorio.");
            return null;
        }

        Optional<Long> resolved = examTypeCache.computeIfAbsent(raw, key -> {
            Optional<ExamType> examType;
            if (key.matches("\\d+")) {
                try {
                    examType = examTypeRepository.findById(Long.parseLong(key));
                } catch (NumberFormatException e) {
                    examType = Optional.empty();
                }
            } else {
                examType = examTypeRepository.findByCode(key.toUpperCase(Locale.ROOT));
            }
            return examType.map(ExamType::getId);
        });

        if (resolved.isEmpty()) {
            errors.add(prefix + "tipo de examen no encontrado: " + raw + ".");
            return null;
        }
        return resolved.get();
    }

    private static String normalizeLetter(String value) {
        String letter = trimToNull(value);
        if (letter == null) {
            return null;
        }
        String upper = letter.toUpperCase(Locale.ROOT);
        return ALLOWED_LETTERS.contains(upper) ? upper : null;
    }

    /** Clave de comparación de enunciados (ver {@link QuestionTextNormalizer}). */
    private static String normalizeText(String value) {
        return QuestionTextNormalizer.normalize(value);
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
