package bir.app.api.service;

import bir.app.api.dto.AnswerRequest;
import bir.app.api.dto.MockExamAttemptResponse;
import bir.app.api.dto.MockExamAttemptSummaryResponse;
import bir.app.api.dto.MockExamStatsResponse;
import bir.app.api.entity.*;
import bir.app.api.repository.MockExamAttemptRepository;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Resolución de simulacros. Un intento es una copia (snapshot) del simulacro en
 * el momento de empezarlo: texto, opciones y letra correcta quedan congelados.
 * Mientras no se entrega no se revela ninguna respuesta correcta.
 */
@Singleton
public class MockExamAttemptService {

    private final MockExamAttemptRepository attemptRepository;
    private final MockExamService mockExamService;
    private final AppUserService appUserService;

    public MockExamAttemptService(MockExamAttemptRepository attemptRepository,
                                  MockExamService mockExamService,
                                  AppUserService appUserService) {
        this.attemptRepository = attemptRepository;
        this.mockExamService = mockExamService;
        this.appUserService = appUserService;
    }

    // --- Ciclo de vida del intento -------------------------------------------

    @Transactional
    public MockExamAttemptResponse start(String username, Long mockExamId) {
        MockExam exam = mockExamService.requireVisible(username, mockExamId);
        if (exam.getQuestions().isEmpty()) {
            throw new IllegalArgumentException("El simulacro no tiene preguntas");
        }

        MockExamAttempt attempt = new MockExamAttempt();
        attempt.setMockExam(exam);
        attempt.setUser(appUserService.requireByUsername(username));
        attempt.setTotalQuestions(exam.getQuestions().size());

        for (MockExamQuestion examQuestion : exam.getQuestions()) {
            Question question = examQuestion.getQuestion();
            MockExamAttemptItem item = new MockExamAttemptItem();
            item.setAttempt(attempt);
            item.setQuestion(question);
            item.setPosition(examQuestion.getPosition());
            item.setQuestionText(question.getText());
            item.setCategory(question.getCategory());
            item.setTag(question.getTag());
            item.setExplanation(question.getExplanation());
            item.setCorrectLetter(correctLetter(question));
            for (AnswerOption option : question.getAnswerOptions()) {
                MockExamAttemptItemOption snapshot = new MockExamAttemptItemOption(
                        option.getLetter(), option.getText(), option.getIsCorrect());
                snapshot.setItem(item);
                item.getOptions().add(snapshot);
            }
            attempt.getItems().add(item);
        }
        return toResponse(attemptRepository.save(attempt));
    }

    @Transactional
    public MockExamAttemptResponse get(String username, Long attemptId) {
        return toResponse(requireAttempt(username, attemptId));
    }

    /**
     * Guarda o cambia una respuesta mientras el intento siga abierto.
     * No revela si es correcta: la respuesta devuelta mantiene oculta la
     * solución hasta que se entrega.
     */
    @Transactional
    public MockExamAttemptResponse answer(String username, Long attemptId, AnswerRequest request) {
        MockExamAttempt attempt = requireAttempt(username, attemptId);
        if (attempt.isFinished()) {
            throw new IllegalArgumentException("El simulacro ya ha sido entregado");
        }

        MockExamAttemptItem item = attempt.getItems().stream()
                .filter(i -> i.getPosition().equals(request.position()))
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException(
                        "Pregunta no encontrada en el intento: " + request.position()));

        String letter = request.letter().trim().toUpperCase();
        boolean validLetter = item.getOptions().stream()
                .anyMatch(o -> o.getLetter().equalsIgnoreCase(letter));
        if (!validLetter) {
            throw new IllegalArgumentException("Opción no válida: " + letter);
        }

        item.setSelectedLetter(letter);
        item.setIsCorrect(letter.equalsIgnoreCase(item.getCorrectLetter()));
        item.setAnsweredAt(LocalDateTime.now());
        recalculateCounters(attempt);

        return toResponse(attemptRepository.save(attempt));
    }

    /** Cierra el intento y calcula el resultado definitivo. Idempotente. */
    @Transactional
    public MockExamAttemptResponse finish(String username, Long attemptId) {
        MockExamAttempt attempt = requireAttempt(username, attemptId);
        if (!attempt.isFinished()) {
            recalculateCounters(attempt);
            attempt.setFinishedAt(LocalDateTime.now());
            attemptRepository.save(attempt);
        }
        return toResponse(attempt);
    }

    /** Resultado con las respuestas correctas reveladas. Exige intento entregado. */
    @Transactional
    public MockExamAttemptResponse result(String username, Long attemptId) {
        MockExamAttempt attempt = requireAttempt(username, attemptId);
        if (!attempt.isFinished()) {
            throw new IllegalArgumentException("El simulacro todavía no ha sido entregado");
        }
        return toResponse(attempt);
    }

    @Transactional
    public List<MockExamAttemptSummaryResponse> history(String username, Long mockExamId) {
        mockExamService.requireVisible(username, mockExamId);
        return attemptRepository.findByMockExamAndUser(mockExamId, username).stream()
                .map(MockExamAttemptService::toSummary)
                .toList();
    }

    // --- Estadísticas --------------------------------------------------------

    @Transactional
    public MockExamStatsResponse stats(String username) {
        List<MockExamAttempt> attempts = attemptRepository.findByUsername(username);

        long finished = attempts.stream().filter(MockExamAttempt::isFinished).count();
        List<MockExamAttempt> finishedAttempts = attempts.stream()
                .filter(MockExamAttempt::isFinished).toList();
        double average = finishedAttempts.stream()
                .mapToDouble(MockExamAttemptService::accuracy)
                .average().orElse(0d);
        Double best = finishedAttempts.stream()
                .mapToDouble(MockExamAttemptService::accuracy)
                .max().orElse(Double.NaN);
        if (Double.isNaN(best)) {
            best = null;
        }

        // Agrupa por simulacro conservando el orden de la última actividad.
        Map<Long, List<MockExamAttempt>> grouped = new LinkedHashMap<>();
        for (MockExamAttempt attempt : attempts) {
            grouped.computeIfAbsent(attempt.getMockExam().getId(), k -> new ArrayList<>()).add(attempt);
        }

        List<MockExamStatsResponse.ByMockExam> byMockExam = grouped.values().stream()
                .map(group -> {
                    MockExam exam = group.get(0).getMockExam();
                    List<MockExamAttempt> done = group.stream()
                            .filter(MockExamAttempt::isFinished).toList();
                    double avg = done.stream()
                            .mapToDouble(MockExamAttemptService::accuracy)
                            .average().orElse(0d);
                    Double groupBest = done.stream()
                            .mapToDouble(MockExamAttemptService::accuracy)
                            .max().orElse(Double.NaN);
                    if (Double.isNaN(groupBest)) {
                        groupBest = null;
                    }
                    LocalDateTime last = group.stream()
                            .map(MockExamAttempt::getStartedAt)
                            .max(LocalDateTime::compareTo)
                            .orElse(null);
                    return new MockExamStatsResponse.ByMockExam(
                            exam.getId(), exam.getTitle(), exam.getExamType().getCode(),
                            group.size(), done.size(),
                            round(avg), groupBest == null ? null : round(groupBest), last);
                })
                .toList();

        return new MockExamStatsResponse(
                attempts.size(), finished, round(average),
                best == null ? null : round(best), byMockExam);
    }

    // --- Helpers -------------------------------------------------------------

    private MockExamAttempt requireAttempt(String username, Long attemptId) {
        MockExamAttempt attempt = attemptRepository.findByIdAndUsername(attemptId, username)
                .orElseThrow(() -> new NoSuchElementException("Intento no encontrado: " + attemptId));
        attempt.getItems().size(); // fuerza la carga de los items dentro de la transacción
        return attempt;
    }

    private static void recalculateCounters(MockExamAttempt attempt) {
        attempt.setAnsweredCount((int) attempt.getItems().stream()
                .filter(MockExamAttemptItem::isAnswered).count());
        attempt.setCorrectCount((int) attempt.getItems().stream()
                .filter(i -> Boolean.TRUE.equals(i.getIsCorrect())).count());
    }

    private static String correctLetter(Question question) {
        return question.getAnswerOptions().stream()
                .filter(o -> Boolean.TRUE.equals(o.getIsCorrect()))
                .map(AnswerOption::getLetter)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "La pregunta " + question.getId() + " no tiene una opción correcta"));
    }

    private static MockExamAttemptResponse toResponse(MockExamAttempt attempt) {
        boolean revealed = attempt.isFinished();
        List<MockExamAttemptResponse.Item> items = attempt.getItems().stream()
                .map(item -> new MockExamAttemptResponse.Item(
                        item.getPosition(),
                        item.getQuestion() == null ? null : item.getQuestion().getId(),
                        item.getQuestionText(),
                        item.getCategory(),
                        item.getTag(),
                        revealed ? item.getExplanation() : null,
                        item.getOptions().stream()
                                .map(o -> new MockExamAttemptResponse.Option(o.getLetter(), o.getText()))
                                .toList(),
                        item.isAnswered(),
                        item.getSelectedLetter(),
                        revealed ? item.getIsCorrect() : null,
                        revealed ? item.getCorrectLetter() : null))
                .toList();

        MockExam exam = attempt.getMockExam();
        return new MockExamAttemptResponse(
                attempt.getId(),
                exam.getId(),
                exam.getTitle(),
                exam.getExamType().getCode(),
                exam.getExamType().getName(),
                revealed,
                attempt.getStartedAt(),
                attempt.getFinishedAt(),
                attempt.getTotalQuestions(),
                attempt.getAnsweredCount(),
                revealed ? attempt.getCorrectCount() : 0,
                revealed ? accuracy(attempt) : 0d,
                items);
    }

    private static MockExamAttemptSummaryResponse toSummary(MockExamAttempt attempt) {
        boolean finished = attempt.isFinished();
        return new MockExamAttemptSummaryResponse(
                attempt.getId(),
                finished,
                attempt.getStartedAt(),
                attempt.getFinishedAt(),
                attempt.getTotalQuestions(),
                attempt.getAnsweredCount(),
                finished ? attempt.getCorrectCount() : 0,
                finished ? accuracy(attempt) : 0d);
    }

    static double accuracy(MockExamAttempt attempt) {
        if (attempt.getTotalQuestions() == null || attempt.getTotalQuestions() == 0) {
            return 0d;
        }
        return round((double) attempt.getCorrectCount() * 100 / attempt.getTotalQuestions());
    }

    private static double round(double value) {
        return Math.round(value * 10) / 10d;
    }
}
