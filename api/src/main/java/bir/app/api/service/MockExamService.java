package bir.app.api.service;

import bir.app.api.dto.CreateMockExamRequest;
import bir.app.api.dto.MockExamResponse;
import bir.app.api.dto.MockExamSummaryResponse;
import bir.app.api.entity.*;
import bir.app.api.repository.ExamTypeRepository;
import bir.app.api.repository.MockExamAttemptRepository;
import bir.app.api.repository.MockExamRepository;
import bir.app.api.repository.QuestionRepository;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Gestión de simulacros: colecciones curadas y ordenadas de preguntas de un
 * único tipo de examen. Los usuarios normales solo ven los simulacros de los
 * bancos que tienen asignados.
 */
@Singleton
public class MockExamService {

    /** Tope de preguntas por simulacro (coincide con el máximo del modo libre). */
    /** Tope de preguntas por simulacro: 200 del examen + 10 de reserva. */
    public static final int MAX_QUESTIONS = 210;

    private final MockExamRepository mockExamRepository;
    private final MockExamAttemptRepository attemptRepository;
    private final QuestionRepository questionRepository;
    private final ExamTypeRepository examTypeRepository;
    private final AppUserService appUserService;
    private final AccessControlService accessControlService;

    public MockExamService(MockExamRepository mockExamRepository,
                           MockExamAttemptRepository attemptRepository,
                           QuestionRepository questionRepository,
                           ExamTypeRepository examTypeRepository,
                           AppUserService appUserService,
                           AccessControlService accessControlService) {
        this.mockExamRepository = mockExamRepository;
        this.attemptRepository = attemptRepository;
        this.questionRepository = questionRepository;
        this.examTypeRepository = examTypeRepository;
        this.appUserService = appUserService;
        this.accessControlService = accessControlService;
    }

    // --- Consultas -----------------------------------------------------------

    /** Simulacros visibles para el usuario, con sus estadísticas de intentos. */
    @Transactional
    public List<MockExamSummaryResponse> listFor(String username) {
        List<MockExam> exams;
        if (accessControlService.hasGlobalBankAccess(username)) {
            exams = mockExamRepository.findAllWithQuestions();
        } else {
            Set<String> allowed = accessControlService.allowedBankCodes(username);
            exams = allowed.isEmpty()
                    ? List.of()
                    : mockExamRepository.findByExamTypeCodeInWithQuestions(allowed);
        }
        if (exams.isEmpty()) {
            return List.of();
        }

        // Una sola consulta de intentos y agrupación en memoria (evita N+1).
        Map<Long, List<MockExamAttempt>> attemptsByExam = new HashMap<>();
        for (MockExamAttempt attempt : attemptRepository.findByUsername(username)) {
            attemptsByExam
                    .computeIfAbsent(attempt.getMockExam().getId(), k -> new ArrayList<>())
                    .add(attempt);
        }
        return exams.stream()
                .map(exam -> toSummary(exam, attemptsByExam.getOrDefault(exam.getId(), List.of())))
                .toList();
    }

    @Transactional
    public MockExamResponse get(String username, Long id) {
        MockExam exam = requireVisible(username, id);
        return toResponse(exam);
    }

    /** Entidad validando que el usuario puede acceder al banco del simulacro. */
    @Transactional
    public MockExam requireVisible(String username, Long id) {
        MockExam exam = mockExamRepository.findDetailedById(id)
                .orElseThrow(() -> new NoSuchElementException("Simulacro no encontrado: " + id));
        accessControlService.requireBankAccess(username, exam.getExamType());
        return exam;
    }

    // --- CRUD (ADMIN/CREATOR) ------------------------------------------------

    @Transactional
    public MockExamResponse create(String username, CreateMockExamRequest request) {
        AppUser author = appUserService.requireByUsername(username);
        MockExam exam = new MockExam();
        exam.setCreatedBy(author);
        apply(exam, request);
        return toResponse(mockExamRepository.save(exam));
    }

    @Transactional
    public MockExamResponse update(Long id, CreateMockExamRequest request) {
        MockExam exam = mockExamRepository.findDetailedById(id)
                .orElseThrow(() -> new NoSuchElementException("Simulacro no encontrado: " + id));
        apply(exam, request);
        return toResponse(mockExamRepository.save(exam));
    }

    @Transactional
    public void delete(Long id) {
        if (!mockExamRepository.existsById(id)) {
            throw new NoSuchElementException("Simulacro no encontrado: " + id);
        }
        mockExamRepository.deleteById(id);
    }

    // --- Helpers -------------------------------------------------------------

    private void apply(MockExam exam, CreateMockExamRequest request) {
        ExamType examType = examTypeRepository.findById(request.examTypeId())
                .orElseThrow(() -> new NoSuchElementException(
                        "Tipo de examen no encontrado: " + request.examTypeId()));

        List<Long> ids = request.questionIds();
        if (ids.size() > MAX_QUESTIONS) {
            throw new IllegalArgumentException(
                    "Un simulacro no puede tener más de " + MAX_QUESTIONS + " preguntas");
        }
        if (new HashSet<>(ids).size() != ids.size()) {
            throw new IllegalArgumentException("Hay preguntas repetidas en el simulacro");
        }

        List<Question> questions = questionRepository.findByIdIn(ids);
        if (questions.size() != ids.size()) {
            Set<Long> found = new HashSet<>(questions.stream().map(Question::getId).toList());
            Set<Long> unknown = new LinkedHashSet<>(ids);
            unknown.removeAll(found);
            throw new NoSuchElementException("Pregunta no encontrada: " + unknown);
        }

        Map<Long, Question> byId = new HashMap<>();
        questions.forEach(q -> byId.put(q.getId(), q));

        List<MockExamQuestion> items = new ArrayList<>();
        for (int i = 0; i < ids.size(); i++) {
            Question question = byId.get(ids.get(i));
            if (!question.getExamType().getId().equals(examType.getId())) {
                throw new IllegalArgumentException(
                        "La pregunta " + question.getId() + " pertenece al banco "
                                + question.getExamType().getCode() + " y el simulacro es de "
                                + examType.getCode());
            }
            MockExamQuestion item = new MockExamQuestion();
            item.setMockExam(exam);
            item.setQuestion(question);
            item.setPosition(i + 1);
            items.add(item);
        }

        exam.setTitle(request.title().trim());
        exam.setDescription(normalize(request.description()));
        exam.setExamType(examType);

        // Orphan removal + flush para evitar choques con UNIQUE(mock_exam_id, position)
        // al reordenar las preguntas de un simulacro existente.
        exam.getQuestions().clear();
        mockExamRepository.flush();
        exam.getQuestions().addAll(items);
    }

    private MockExamSummaryResponse toSummary(MockExam exam, List<MockExamAttempt> attempts) {
        List<MockExamAttempt> finished = attempts.stream()
                .filter(MockExamAttempt::isFinished)
                .toList();
        Double best = finished.stream()
                .mapToDouble(MockExamAttemptService::accuracy)
                .max().orElse(Double.NaN);
        Long inProgress = attempts.stream()
                .filter(a -> !a.isFinished())
                .map(MockExamAttempt::getId)
                .findFirst()
                .orElse(null);
        LocalDateTime last = attempts.stream()
                .map(MockExamAttempt::getStartedAt)
                .max(LocalDateTime::compareTo)
                .orElse(null);

        return new MockExamSummaryResponse(
                exam.getId(),
                exam.getTitle(),
                exam.getDescription(),
                exam.getExamType().getCode(),
                exam.getExamType().getName(),
                exam.getQuestions().size(),
                attempts.size(),
                finished.size(),
                Double.isNaN(best) ? null : round(best),
                last,
                inProgress);
    }

    private MockExamResponse toResponse(MockExam exam) {
        Map<Long, List<AnswerOption>> optionsByQuestion = loadOptions(exam);
        List<MockExamResponse.QuestionSummary> questions = exam.getQuestions().stream()
                .map(q -> new MockExamResponse.QuestionSummary(
                        q.getPosition(),
                        q.getQuestion().getId(),
                        q.getQuestion().getText(),
                        q.getQuestion().getCategory(),
                        q.getQuestion().getTag(),
                        q.getQuestion().getExplanation(),
                        optionsByQuestion.getOrDefault(q.getQuestion().getId(), List.of()).stream()
                                .map(o -> new MockExamResponse.OptionSummary(o.getLetter(), o.getText()))
                                .toList()))
                .toList();
        return new MockExamResponse(
                exam.getId(),
                exam.getTitle(),
                exam.getDescription(),
                exam.getExamType().getCode(),
                exam.getExamType().getName(),
                questions.size(),
                questions);
    }

    /**
     * Carga las opciones de todas las preguntas del simulacro en una única
     * consulta (el {@code EntityGraph} de {@link QuestionRepository#findByIdIn}
     * inicializa {@code answerOptions}), evitando el N+1 al montar la respuesta.
     * Solo se usan letra y texto: la marca de correcta nunca sale de aquí.
     */
    private Map<Long, List<AnswerOption>> loadOptions(MockExam exam) {
        List<Long> ids = exam.getQuestions().stream()
                .map(mq -> mq.getQuestion().getId())
                .toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<Long, List<AnswerOption>> byQuestion = new HashMap<>();
        for (Question question : questionRepository.findByIdIn(ids)) {
            byQuestion.put(question.getId(), question.getAnswerOptions());
        }
        return byQuestion;
    }

    private static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static double round(double value) {
        return Math.round(value * 10) / 10d;
    }
}
