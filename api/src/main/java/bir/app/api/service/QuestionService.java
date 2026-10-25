package bir.app.api.service;

import bir.app.api.dto.CreateQuestionRequest;
import bir.app.api.dto.DashboardStatsResponse;
import bir.app.api.dto.QuestionPageResponse;
import bir.app.api.dto.QuestionResponse;
import bir.app.api.dto.QuestionSummaryResponse;
import bir.app.api.entity.AnswerOption;
import bir.app.api.entity.ExamType;
import bir.app.api.entity.Question;
import bir.app.api.repository.ExamTypeRepository;
import bir.app.api.repository.MockExamRepository;
import bir.app.api.repository.QuestionRepository;
import io.micronaut.data.model.Page;
import io.micronaut.data.model.Pageable;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Set;

@Singleton
public class QuestionService {

    /** Tamaño de página por defecto del listado de preguntas. */
    public static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;
    /** Valor de categoría que significa "preguntas sin categoría". */
    public static final String NO_CATEGORY = "__NONE__";

    private final QuestionRepository questionRepository;
    private final ExamTypeRepository examTypeRepository;
    private final MockExamRepository mockExamRepository;
    private final AccessControlService accessControlService;

    public QuestionService(QuestionRepository questionRepository,
                           ExamTypeRepository examTypeRepository,
                           MockExamRepository mockExamRepository,
                           AccessControlService accessControlService) {
        this.questionRepository = questionRepository;
        this.examTypeRepository = examTypeRepository;
        this.mockExamRepository = mockExamRepository;
        this.accessControlService = accessControlService;
    }

    @Transactional
    public List<QuestionResponse> findAll() {
        return questionRepository.findAll()
                .stream().map(QuestionResponse::from)
                .toList();
    }

    @Transactional
    public QuestionResponse findById(Long id) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Question not found: " + id));
        return QuestionResponse.from(question);
    }

    @Transactional
    public QuestionResponse create(CreateQuestionRequest request) {
        ExamType examType = examTypeRepository.findById(request.examTypeId())
                .orElseThrow(() -> new NoSuchElementException("Exam type not found: " + request.examTypeId()));

        long correctCount = request.answerOptions().stream()
                .filter(CreateQuestionRequest.AnswerOptionRequest::isCorrect)
                .count();
        if (correctCount != 1) {
            throw new IllegalArgumentException("Exactly one answer must be correct, but found " + correctCount);
        }

        Question question = new Question();
        question.setText(request.text());
        question.setCategory(request.category());
        question.setTag(normalize(request.tag()));
        question.setExplanation(normalize(request.explanation()));
        question.setExamType(examType);

        List<AnswerOption> options = request.answerOptions().stream().map(opt -> {
            AnswerOption option = new AnswerOption(opt.letter(), opt.text(), opt.isCorrect());
            option.setQuestion(question);
            return option;
        }).toList();

        question.setAnswerOptions(new ArrayList<>(options));
        return QuestionResponse.from(questionRepository.save(question));
    }

    @Transactional
    public QuestionResponse update(Long id, CreateQuestionRequest request) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Question not found: " + id));

        ExamType examType = examTypeRepository.findById(request.examTypeId())
                .orElseThrow(() -> new NoSuchElementException("Exam type not found: " + request.examTypeId()));

        long correctCount = request.answerOptions().stream()
                .filter(CreateQuestionRequest.AnswerOptionRequest::isCorrect)
                .count();
        if (correctCount != 1) {
            throw new IllegalArgumentException("Exactly one answer must be correct, but found " + correctCount);
        }

        question.setText(request.text());
        question.setCategory(request.category());
        question.setTag(normalize(request.tag()));
        question.setExplanation(normalize(request.explanation()));
        question.setExamType(examType);

        question.getAnswerOptions().clear();
        // Fuerza los DELETE del orphan removal antes de reinsertar opciones con las
        // mismas letras; sin este flush Hibernate ejecutaría los INSERT primero y
        // violaría la restricción UNIQUE(question_id, letter).
        questionRepository.flush();
        List<AnswerOption> options = request.answerOptions().stream().map(opt -> {
            AnswerOption option = new AnswerOption(opt.letter(), opt.text(), opt.isCorrect());
            option.setQuestion(question);
            return option;
        }).toList();
        question.getAnswerOptions().addAll(options);

        return QuestionResponse.from(questionRepository.save(question));
    }

    @Transactional
    public void delete(Long id) {
        if (!questionRepository.existsById(id)) {
            throw new NoSuchElementException("Question not found: " + id);
        }
        if (mockExamRepository.countByQuestionId(id) > 0) {
            throw new IllegalArgumentException(
                    "La pregunta forma parte de un simulacro; quítala del simulacro antes de eliminarla");
        }
        questionRepository.deleteById(id);
    }

    @Transactional
    public List<QuestionResponse> findByExamType(String examTypeCode) {
        return questionRepository.findByExamTypeCode(examTypeCode)
                .stream().map(QuestionResponse::from)
                .toList();
    }

    @Transactional
    public List<String> listCategories() {
        return questionRepository.findDistinctCategories();
    }

    @Transactional
    public List<String> listTags() {
        return questionRepository.findDistinctTags();
    }

    /**
     * Búsqueda paginada del banco de preguntas. Ordena de más reciente a más
     * antigua y devuelve solo los datos que pinta el listado.
     */
    @Transactional
    public QuestionPageResponse search(Integer page, Integer size, String q,
                                       String examType, String category, String tag) {
        int pageNumber = (page == null || page < 1) ? 1 : page;
        int pageSize = (size == null || size < 1)
                ? DEFAULT_PAGE_SIZE
                : Math.min(size, MAX_PAGE_SIZE);
        String examTypeCode = normalize(examType);
        String categoryFilter = normalize(category);
        String tagFilter = normalize(tag);
        String text = normalizeSearch(q);
        String pattern = "%" + text + "%";

        Page<Question> result = questionRepository.search(
                examTypeCode == null ? "" : examTypeCode,
                categoryFilter == null ? "" : categoryFilter,
                tagFilter == null ? "" : tagFilter,
                pattern,
                Pageable.from(pageNumber - 1, pageSize));

        // Si la página pedida ya no existe (p. ej. tras borrar preguntas),
        // devuelve la última página disponible.
        if (result.getTotalPages() > 0 && pageNumber > result.getTotalPages()) {
            result = questionRepository.search(
                    examTypeCode == null ? "" : examTypeCode,
                    categoryFilter == null ? "" : categoryFilter,
                    tagFilter == null ? "" : tagFilter,
                    pattern,
                    Pageable.from(result.getTotalPages() - 1, pageSize));
        }

        List<QuestionSummaryResponse> items = result.getContent() == null
                ? List.of()
                : result.getContent().stream().map(QuestionSummaryResponse::from).toList();
        return new QuestionPageResponse(
                items,
                result.getPageNumber() + 1,
                result.getSize(),
                result.getTotalSize(),
                result.getTotalPages());
    }

    @Transactional
    public DashboardStatsResponse dashboardStats() {
        List<DashboardStatsResponse.ExamTypeStats> byExamType = examTypeRepository.countQuestionsByExamType();
        long total = byExamType.stream()
                .mapToLong(DashboardStatsResponse.ExamTypeStats::total)
                .sum();
        return new DashboardStatsResponse(total, byExamType);
    }

    /**
     * Contadores del banco de preguntas visibles para el usuario: todos para
     * ADMIN/CREATOR; solo los bancos asignados para el rol USER.
     */
    @Transactional
    public DashboardStatsResponse dashboardStatsFor(String username) {
        if (accessControlService.hasGlobalBankAccess(username)) {
            return dashboardStats();
        }
        Set<String> allowed = accessControlService.allowedBankCodes(username);
        List<DashboardStatsResponse.ExamTypeStats> byExamType = examTypeRepository.countQuestionsByExamType().stream()
                .filter(stats -> allowed.contains(stats.code()))
                .toList();
        long total = byExamType.stream()
                .mapToLong(DashboardStatsResponse.ExamTypeStats::total)
                .sum();
        return new DashboardStatsResponse(total, byExamType);
    }

    private static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    /** Texto de búsqueda en minúsculas y sin acentos (igual que el translate de la query). */
    private static String normalizeSearch(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return Normalizer.normalize(value.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }
}
