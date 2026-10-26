package bir.app.api.service;

import bir.app.api.dto.DuplicatePurgeResponse;
import bir.app.api.dto.DuplicateQuestionsResponse;
import bir.app.api.entity.AnswerProposal;
import bir.app.api.entity.AnswerOption;
import bir.app.api.entity.MockExamQuestion;
import bir.app.api.entity.Question;
import bir.app.api.repository.AnswerProposalRepository;
import bir.app.api.repository.MockExamQuestionRepository;
import bir.app.api.repository.QuestionRepository;
import bir.app.api.repository.SessionItemRepository;
import bir.app.api.support.QuestionTextNormalizer;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Limpieza de preguntas duplicadas.
 *
 * <p>Dos preguntas son duplicadas cuando están en el <strong>mismo banco</strong>,
 * tienen el <strong>mismo enunciado</strong> (normalizado: minúsculas, sin
 * acentos y con los espacios colapsados, igual que en la importación) y las
 * <strong>mismas opciones</strong> (mismas letras con el mismo texto normalizado y
 * la misma letra correcta). Así solo se borra lo que realmente es la misma
 * pregunta: una diferencia de formato en una opción la deja fuera.</p>
 *
 * <p>De cada grupo se conserva la pregunta <strong>más completa</strong> (con
 * explicación, luego con más opciones, y a igualdad la más antigua) y el
 * historial de las que se borran se re-apunta a la conservada: apariciones en
 * simulacros, propuestas de respuesta e ítems de sesiones libres. Cuando el
 * re-apuntado choca con una restricción única (el simulacro ya tiene la
 * conservada, o el usuario ya propuso una respuesta sobre ella) se elimina la
 * fila duplicada y se informa en el resumen.</p>
 *
 * <p>La purga se hace por pasadas: cada llamada procesa como mucho
 * {@code maxGroups} grupos dentro de una única transacción. La vista repite hasta
 * que {@code remaining} es 0, de modo que ninguna petición se acerque al
 * timeout HTTP.</p>
 */
@Singleton
public class QuestionDuplicatesService {

    private static final Logger LOG = LoggerFactory.getLogger(QuestionDuplicatesService.class);

    /** Grupos que se listan como máximo en la vista previa. */
    static final int MAX_PREVIEW_GROUPS = 200;
    /** Grupos que se procesan como máximo en una pasada de la purga. */
    static final int DEFAULT_MAX_GROUPS = 200;
    /** Tope duro, para que una petición manual no dispare el tiempo de respuesta. */
    static final int MAX_GROUPS_LIMIT = 1000;

    private final QuestionRepository questionRepository;
    private final MockExamQuestionRepository mockExamQuestionRepository;
    private final AnswerProposalRepository answerProposalRepository;
    private final SessionItemRepository sessionItemRepository;

    public QuestionDuplicatesService(QuestionRepository questionRepository,
                                     MockExamQuestionRepository mockExamQuestionRepository,
                                     AnswerProposalRepository answerProposalRepository,
                                     SessionItemRepository sessionItemRepository) {
        this.questionRepository = questionRepository;
        this.mockExamQuestionRepository = mockExamQuestionRepository;
        this.answerProposalRepository = answerProposalRepository;
        this.sessionItemRepository = sessionItemRepository;
    }

    /** Vista previa (solo lectura) de los duplicados que se borrarían. */
    @Transactional
    public DuplicateQuestionsResponse findDuplicates(String examTypeCode) {
        List<Question> questions = questionRepository.findAllWithOptions(blankToEmpty(examTypeCode));
        List<List<Question>> duplicateGroups = duplicateGroups(questions);

        int totalDuplicates = duplicateGroups.stream().mapToInt(group -> group.size() - 1).sum();
        List<List<Question>> preview = duplicateGroups.stream().limit(MAX_PREVIEW_GROUPS).toList();

        Set<Long> previewIds = new HashSet<>();
        for (List<Question> group : preview) {
            for (Question question : group) {
                previewIds.add(question.getId());
            }
        }
        Set<Long> inMockExams = new HashSet<>(mockExamQuestionRepository.findQuestionIdsIn(previewIds));
        Set<Long> withProposals = new HashSet<>(answerProposalRepository.findQuestionIdsIn(previewIds));
        Set<Long> inSessions = new HashSet<>(sessionItemRepository.findQuestionIdsIn(previewIds));

        List<DuplicateQuestionsResponse.DuplicateQuestionGroup> groups = new ArrayList<>();
        for (List<Question> group : preview) {
            Question keeper = chooseKeeper(group);
            List<DuplicateQuestionsResponse.DuplicateCandidate> duplicates = group.stream()
                    .filter(question -> !question.getId().equals(keeper.getId()))
                    .map(question -> toCandidate(question, inMockExams, withProposals, inSessions))
                    .toList();
            groups.add(new DuplicateQuestionsResponse.DuplicateQuestionGroup(
                    keeper.getExamType().getId(),
                    keeper.getExamType().getCode(),
                    keeper.getText(),
                    keeper.getId(),
                    keepReason(keeper, group),
                    duplicates));
        }

        return new DuplicateQuestionsResponse(
                groups,
                duplicateGroups.size(),
                totalDuplicates,
                duplicateGroups.size() > MAX_PREVIEW_GROUPS,
                similarTextGroups(questions));
    }

    /**
     * Borra las preguntas duplicadas, como mucho {@code maxGroups} grupos en esta
     * pasada. Todo lo que se toca en una pasada se hace en la misma transacción:
     * si algo falla, no queda una limpieza a medias.
     */
    @Transactional
    public DuplicatePurgeResponse purge(String examTypeCode, Integer maxGroups) {
        int limit = maxGroups == null || maxGroups < 1
                ? DEFAULT_MAX_GROUPS
                : Math.min(maxGroups, MAX_GROUPS_LIMIT);

        List<Question> questions = questionRepository.findAllWithOptions(blankToEmpty(examTypeCode));
        List<List<Question>> duplicateGroups = duplicateGroups(questions);
        List<List<Question>> toProcess = duplicateGroups.stream().limit(limit).toList();
        int remaining = duplicateGroups.size() - toProcess.size();

        int deleted = 0;
        int mockExamLinksRepointed = 0;
        int mockExamLinksRemoved = 0;
        int positionsRenumbered = 0;
        int proposalsRepointed = 0;
        int proposalsDeleted = 0;
        int sessionItemsRepointed = 0;
        List<String> notes = new ArrayList<>();

        for (List<Question> group : toProcess) {
            Question keeper = chooseKeeper(group);
            List<Question> duplicates = group.stream()
                    .filter(question -> !question.getId().equals(keeper.getId()))
                    .toList();

            List<Long> groupIds = group.stream().map(Question::getId).toList();
            List<AnswerProposal> proposals = answerProposalRepository.findByQuestionIdIn(groupIds);
            Map<Long, List<AnswerProposal>> proposalsByQuestion = proposals.stream()
                    .collect(Collectors.groupingBy(proposal -> proposal.getQuestion().getId()));
            Set<Long> keeperProposalUsers = usersOf(proposalsByQuestion.get(keeper.getId()));

            for (Question duplicate : duplicates) {
                // 1) Simulacros: re-apuntar o quitar la aparición duplicada.
                Result mockExams = rePointMockExams(duplicate, keeper);
                mockExamLinksRepointed += mockExams.repointed();
                mockExamLinksRemoved += mockExams.removed();
                positionsRenumbered += mockExams.renumbered();

                // 2) Propuestas: re-apuntar o borrar si el usuario ya propuso sobre la conservada.
                for (AnswerProposal proposal : proposalsByQuestion.getOrDefault(duplicate.getId(), List.of())) {
                    Long userId = proposal.getProposedBy().getId();
                    if (keeperProposalUsers.contains(userId)) {
                        answerProposalRepository.delete(proposal);
                        proposalsDeleted++;
                    } else {
                        proposal.setQuestion(keeper);
                        answerProposalRepository.update(proposal);
                        keeperProposalUsers.add(userId);
                        proposalsRepointed++;
                    }
                }

                // 3) Sesiones libres: el ítem conserva posición y snapshot.
                sessionItemsRepointed += sessionItemRepository.rePointQuestion(
                        duplicate.getId(), keeper.getId());

                // 4) Borrar la duplicada (cascade de opciones; los intentos guardan snapshot).
                questionRepository.delete(duplicate);
                deleted++;
            }
            notes.add("Grupo '" + shorten(keeper.getText()) + "': se conserva la pregunta " + keeper.getId());
        }

        LOG.info("Limpieza de duplicados: {} grupos procesados, {} preguntas borradas, "
                        + "{} enlaces de simulacro re-apuntados, {} retirados, {} propuestas re-apuntadas, "
                        + "{} borradas, {} ítems de sesión re-apuntados, quedan {} grupos",
                toProcess.size(), deleted, mockExamLinksRepointed, mockExamLinksRemoved,
                proposalsRepointed, proposalsDeleted, sessionItemsRepointed, remaining);

        return new DuplicatePurgeResponse(
                toProcess.size(), deleted, mockExamLinksRepointed, mockExamLinksRemoved,
                positionsRenumbered, proposalsRepointed, proposalsDeleted,
                sessionItemsRepointed, remaining, notes);
    }

    // --- Agrupación ------------------------------------------------------------

    /** Grupos (más de una pregunta) que son duplicados exactos. */
    private static List<List<Question>> duplicateGroups(List<Question> questions) {
        Map<String, List<Question>> bySignature = new LinkedHashMap<>();
        for (Question question : questions) {
            bySignature.computeIfAbsent(groupKey(question), key -> new ArrayList<>()).add(question);
        }
        return bySignature.values().stream().filter(group -> group.size() > 1).toList();
    }

    /**
     * Enunciados repetidos con opciones distintas: no se borran, pero se listan
     * para que se puedan revisar a mano. Se muestra una pregunta representativa
     * por cada variante de opciones.
     */
    private static List<DuplicateQuestionsResponse.SimilarTextGroup> similarTextGroups(List<Question> questions) {
        Map<String, List<Question>> byText = new LinkedHashMap<>();
        for (Question question : questions) {
            byText.computeIfAbsent(textKey(question), key -> new ArrayList<>()).add(question);
        }

        List<DuplicateQuestionsResponse.SimilarTextGroup> similar = new ArrayList<>();
        for (List<Question> sameText : byText.values()) {
            Map<String, List<Question>> bySignature = sameText.stream()
                    .collect(Collectors.groupingBy(QuestionDuplicatesService::signature,
                            LinkedHashMap::new, Collectors.toList()));
            if (bySignature.size() < 2) {
                continue;
            }
            List<Long> representatives = bySignature.values().stream()
                    .map(QuestionDuplicatesService::chooseKeeper)
                    .map(Question::getId)
                    .toList();
            Question first = sameText.get(0);
            similar.add(new DuplicateQuestionsResponse.SimilarTextGroup(
                    first.getExamType().getId(),
                    first.getExamType().getCode(),
                    first.getText(),
                    representatives));
        }
        return similar;
    }

    /**
     * Clave de duplicado: banco + enunciado normalizado + firma de las opciones
     * (letras ordenadas con su texto normalizado y cuál es la correcta).
     */
    private static String groupKey(Question question) {
        return textKey(question) + "||" + signature(question);
    }

    private static String textKey(Question question) {
        return question.getExamType().getId() + "||" + QuestionTextNormalizer.normalize(question.getText());
    }

    private static String signature(Question question) {
        return question.getAnswerOptions().stream()
                .sorted(Comparator.comparing(AnswerOption::getLetter))
                .map(option -> option.getLetter()
                        + (Boolean.TRUE.equals(option.getIsCorrect()) ? "*" : "")
                        + ":" + QuestionTextNormalizer.normalize(option.getText()))
                .collect(Collectors.joining("|"));
    }

    // --- Selección de la conservada --------------------------------------------

    /** Conserva la más completa: con explicación, luego con más opciones, luego la más antigua. */
    private static Question chooseKeeper(List<Question> group) {
        Question best = group.get(0);
        for (Question candidate : group) {
            if (isBetter(candidate, best)) {
                best = candidate;
            }
        }
        return best;
    }

    private static boolean isBetter(Question candidate, Question current) {
        boolean candidateExplains = hasText(candidate.getExplanation());
        boolean currentExplains = hasText(current.getExplanation());
        if (candidateExplains != currentExplains) {
            return candidateExplains;
        }
        int candidateOptions = candidate.getAnswerOptions().size();
        int currentOptions = current.getAnswerOptions().size();
        if (candidateOptions != currentOptions) {
            return candidateOptions > currentOptions;
        }
        return candidate.getId() < current.getId();
    }

    private static String keepReason(Question keeper, List<Question> group) {
        boolean explains = hasText(keeper.getExplanation());
        int maxOptions = group.stream()
                .mapToInt(question -> question.getAnswerOptions().size())
                .max().orElse(0);
        if (explains) {
            return "Es la única con explicación (o una de ellas) y por eso se conserva.";
        }
        if (keeper.getAnswerOptions().size() >= maxOptions) {
            return "Tiene más opciones que las demás; a igualdad se conserva la más antigua.";
        }
        return "Se conserva la más antigua.";
    }

    // --- Re-apuntado de simulacros ---------------------------------------------

    private record Result(int repointed, int removed, int renumbered) {}

    private Result rePointMockExams(Question duplicate, Question keeper) {
        List<MockExamQuestion> links = mockExamQuestionRepository.findByQuestionId(duplicate.getId());
        if (links.isEmpty()) {
            return new Result(0, 0, 0);
        }
        Set<Long> keepersMockExams = mockExamQuestionRepository.findByQuestionId(keeper.getId()).stream()
                .map(link -> link.getMockExam().getId())
                .collect(Collectors.toCollection(HashSet::new));

        int repointed = 0;
        int removed = 0;
        int renumbered = 0;
        for (MockExamQuestion link : links) {
            Long mockExamId = link.getMockExam().getId();
            if (keepersMockExams.contains(mockExamId)) {
                // El simulacro ya tiene la conservada: sobra esta aparición.
                Integer position = link.getPosition();
                mockExamQuestionRepository.delete(link);
                mockExamQuestionRepository.flush();
                mockExamQuestionRepository.shiftPositionsAfter(mockExamId, position);
                removed++;
                renumbered++;
            } else {
                link.setQuestion(keeper);
                mockExamQuestionRepository.update(link);
                keepersMockExams.add(mockExamId);
                repointed++;
            }
        }
        return new Result(repointed, removed, renumbered);
    }

    // --- Utilidades ------------------------------------------------------------

    private static Set<Long> usersOf(List<AnswerProposal> proposals) {
        if (proposals == null) {
            return new HashSet<>();
        }
        Set<Long> users = new HashSet<>();
        for (AnswerProposal proposal : proposals) {
            users.add(proposal.getProposedBy().getId());
        }
        return users;
    }

    private static DuplicateQuestionsResponse.DuplicateCandidate toCandidate(
            Question question, Set<Long> inMockExams, Set<Long> withProposals, Set<Long> inSessions) {
        Long id = question.getId();
        return new DuplicateQuestionsResponse.DuplicateCandidate(
                id,
                question.getCategory(),
                question.getTag(),
                hasText(question.getExplanation()),
                question.getAnswerOptions().size(),
                inMockExams.contains(id),
                withProposals.contains(id),
                inSessions.contains(id));
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String blankToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    private static String shorten(String text) {
        if (text == null) {
            return "";
        }
        String flat = text.replaceAll("\\s+", " ").trim();
        return flat.length() <= 60 ? flat : flat.substring(0, 60) + "…";
    }
}
