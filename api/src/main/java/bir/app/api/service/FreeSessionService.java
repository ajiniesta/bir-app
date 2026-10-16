package bir.app.api.service;

import bir.app.api.dto.AnswerRequest;
import bir.app.api.dto.CreateFreeSessionRequest;
import bir.app.api.dto.FreeSessionResponse;
import bir.app.api.dto.QuizStatsResponse;
import bir.app.api.entity.*;
import bir.app.api.repository.ExamTypeRepository;
import bir.app.api.repository.FreeSessionRepository;
import bir.app.api.repository.QuestionRepository;
import bir.app.api.repository.SessionItemRepository;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Lógica del "modo libre": crear una partida con una serie aleatoria de preguntas,
 * responderlas una a una y calcular estadísticas.
 */
@Singleton
public class FreeSessionService {

    private final FreeSessionRepository freeSessionRepository;
    private final SessionItemRepository sessionItemRepository;
    private final QuestionRepository questionRepository;
    private final ExamTypeRepository examTypeRepository;
    private final AppUserService appUserService;

    public FreeSessionService(FreeSessionRepository freeSessionRepository,
                              SessionItemRepository sessionItemRepository,
                              QuestionRepository questionRepository,
                              ExamTypeRepository examTypeRepository,
                              AppUserService appUserService) {
        this.freeSessionRepository = freeSessionRepository;
        this.sessionItemRepository = sessionItemRepository;
        this.questionRepository = questionRepository;
        this.examTypeRepository = examTypeRepository;
        this.appUserService = appUserService;
    }

    @Transactional
    public FreeSessionResponse create(String username, CreateFreeSessionRequest request) {
        AppUser user = appUserService.requireByUsername(username);
        ExamType examType = resolveExamType(request.examTypeCode());
        String category = normalize(request.category());

        List<Question> pool = new ArrayList<>(loadPool(examType, category));
        Collections.shuffle(pool);
        int count = Math.min(request.count(), pool.size());
        if (count == 0) {
            throw new IllegalArgumentException("No hay preguntas que coincidan con el filtro seleccionado");
        }

        FreeSession session = new FreeSession();
        session.setUser(user);
        session.setExamType(examType);
        session.setCategory(category);
        session.setRequestedCount(request.count());
        for (int i = 0; i < count; i++) {
            SessionItem item = new SessionItem();
            item.setSession(session);
            item.setQuestion(pool.get(i));
            item.setPosition(i + 1);
            session.getItems().add(item);
        }
        return toResponse(freeSessionRepository.save(session));
    }

    @Transactional
    public FreeSessionResponse get(String username, Long sessionId) {
        return toResponse(requireSession(username, sessionId));
    }

    @Transactional
    public FreeSessionResponse answer(String username, Long sessionId, AnswerRequest request) {
        FreeSession session = requireSession(username, sessionId);
        SessionItem item = session.getItems().stream()
                .filter(i -> i.getPosition().equals(request.position()))
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException(
                        "Pregunta no encontrada en la sesión: " + request.position()));

        if (item.isAnswered()) {
            throw new IllegalArgumentException("Esa pregunta ya ha sido respondida");
        }

        String letter = request.letter().trim().toUpperCase();
        List<AnswerOption> options = item.getQuestion().getAnswerOptions();
        boolean validLetter = options.stream().anyMatch(o -> o.getLetter().equalsIgnoreCase(letter));
        if (!validLetter) {
            throw new IllegalArgumentException("Opción no válida: " + letter);
        }

        boolean correct = options.stream()
                .anyMatch(o -> o.getLetter().equalsIgnoreCase(letter) && Boolean.TRUE.equals(o.getIsCorrect()));
        item.setSelectedLetter(letter);
        item.setIsCorrect(correct);
        item.setAnsweredAt(LocalDateTime.now());

        if (session.getItems().stream().allMatch(SessionItem::isAnswered)) {
            session.setFinishedAt(LocalDateTime.now());
        }
        return toResponse(freeSessionRepository.save(session));
    }

    @Transactional
    public QuizStatsResponse stats(String username) {
        long sessions = freeSessionRepository.countByUserUsername(username);
        List<SessionItem> mineAnswered = sessionItemRepository.findAnsweredByUsername(username);
        long mineAnsweredCount = mineAnswered.size();
        long mineCorrect = countCorrect(mineAnswered);
        QuizStatsResponse.Mine mine = new QuizStatsResponse.Mine(
                sessions, mineAnsweredCount, mineCorrect,
                pct(mineCorrect, mineAnsweredCount), byExamType(mineAnswered));

        long users = freeSessionRepository.countDistinctUsers();
        long globalSessions = freeSessionRepository.count();
        List<SessionItem> allAnswered = sessionItemRepository.findAllAnswered();
        long globalAnswered = allAnswered.size();
        long globalCorrect = countCorrect(allAnswered);
        QuizStatsResponse.Global global = new QuizStatsResponse.Global(
                users, globalSessions, globalAnswered, globalCorrect,
                pct(globalCorrect, globalAnswered), byExamType(allAnswered));

        return new QuizStatsResponse(mine, global);
    }

    // --- helpers -------------------------------------------------------------

    private FreeSession requireSession(String username, Long sessionId) {
        FreeSession session = freeSessionRepository.findById(sessionId)
                .orElseThrow(() -> new NoSuchElementException("Sesión no encontrada: " + sessionId));
        if (!session.getUser().getUsername().equals(username)) {
            throw new NoSuchElementException("Sesión no encontrada: " + sessionId);
        }
        session.getItems().size(); // fuerza la carga de los items dentro de la transacción
        return session;
    }

    private ExamType resolveExamType(String examTypeCode) {
        if (examTypeCode == null || examTypeCode.isBlank()) {
            return null;
        }
        return examTypeRepository.findByCode(examTypeCode.trim().toUpperCase())
                .orElseThrow(() -> new NoSuchElementException("Tipo de examen no encontrado: " + examTypeCode));
    }

    private List<Question> loadPool(ExamType examType, String category) {
        List<Question> questions = examType == null
                ? questionRepository.findAll()
                : questionRepository.findByExamTypeCode(examType.getCode());
        if (category == null) {
            return questions;
        }
        return questions.stream()
                .filter(q -> q.getCategory() != null && q.getCategory().equalsIgnoreCase(category))
                .toList();
    }

    private static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private FreeSessionResponse toResponse(FreeSession session) {
        List<FreeSessionResponse.Item> items = session.getItems().stream().map(this::toItem).toList();
        int answered = (int) session.getItems().stream().filter(SessionItem::isAnswered).count();
        int correct = (int) session.getItems().stream()
                .filter(i -> Boolean.TRUE.equals(i.getIsCorrect())).count();
        return new FreeSessionResponse(
                session.getId(),
                session.getExamType() == null ? null : session.getExamType().getCode(),
                session.getExamType() == null ? null : session.getExamType().getName(),
                session.getCategory(),
                session.getItems().size(),
                answered,
                correct,
                session.isFinished(),
                items);
    }

    private FreeSessionResponse.Item toItem(SessionItem item) {
        Question question = item.getQuestion();
        List<FreeSessionResponse.Option> options = question.getAnswerOptions().stream()
                .map(o -> new FreeSessionResponse.Option(o.getLetter(), o.getText()))
                .toList();
        String correctLetter = item.isAnswered()
                ? question.getAnswerOptions().stream()
                    .filter(o -> Boolean.TRUE.equals(o.getIsCorrect()))
                    .map(AnswerOption::getLetter)
                    .findFirst()
                    .orElse(null)
                : null;
        return new FreeSessionResponse.Item(
                item.getPosition(),
                question.getId(),
                question.getText(),
                question.getCategory(),
                options,
                item.isAnswered(),
                item.getSelectedLetter(),
                item.getIsCorrect(),
                correctLetter);
    }

    private List<QuizStatsResponse.ExamTypeAccuracy> byExamType(List<SessionItem> items) {
        Map<String, long[]> acc = new LinkedHashMap<>();
        Map<String, String> names = new HashMap<>();
        for (SessionItem item : items) {
            ExamType et = item.getQuestion().getExamType();
            names.putIfAbsent(et.getCode(), et.getName());
            long[] counts = acc.computeIfAbsent(et.getCode(), k -> new long[2]);
            counts[0]++;
            if (Boolean.TRUE.equals(item.getIsCorrect())) {
                counts[1]++;
            }
        }
        return acc.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> {
                    long answered = e.getValue()[0];
                    long correct = e.getValue()[1];
                    return new QuizStatsResponse.ExamTypeAccuracy(
                            e.getKey(), names.get(e.getKey()), answered, correct, pct(correct, answered));
                })
                .toList();
    }

    private static long countCorrect(List<SessionItem> items) {
        return items.stream().filter(i -> Boolean.TRUE.equals(i.getIsCorrect())).count();
    }

    private static double pct(long correct, long answered) {
        return answered == 0 ? 0d : Math.round((double) correct * 1000 / answered) / 10d;
    }
}
