package bir.app.api.service;

import bir.app.api.dto.DuplicatePurgeResponse;
import bir.app.api.dto.DuplicateQuestionsResponse;
import bir.app.api.entity.AnswerProposal;
import bir.app.api.entity.ExamType;
import bir.app.api.entity.MockExam;
import bir.app.api.entity.MockExamQuestion;
import bir.app.api.entity.Question;
import bir.app.api.entity.UserRole;
import bir.app.api.repository.AnswerProposalRepository;
import bir.app.api.repository.MockExamQuestionRepository;
import bir.app.api.repository.QuestionRepository;
import bir.app.api.repository.SessionItemRepository;
import bir.app.api.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("QuestionDuplicatesService")
class QuestionDuplicatesServiceTest {

    @Mock
    QuestionRepository questionRepository;
    @Mock
    MockExamQuestionRepository mockExamQuestionRepository;
    @Mock
    AnswerProposalRepository answerProposalRepository;
    @Mock
    SessionItemRepository sessionItemRepository;

    QuestionDuplicatesService service;

    ExamType mir;

    @BeforeEach
    void setUp() {
        service = new QuestionDuplicatesService(questionRepository, mockExamQuestionRepository,
                answerProposalRepository, sessionItemRepository);
        mir = TestData.examType(1L, "MIR", "Médico Interno Residente");
    }

    private Question question(Long id, String text) {
        return TestData.question(id, text, mir,
                TestData.option("A", "Opción A", true),
                TestData.option("B", "Opción B", false));
    }

    private void givenQuestions(Question... questions) {
        when(questionRepository.findAllWithOptions("")).thenReturn(List.of(questions));
    }

    /** Contadores de la vista previa: ninguna pregunta tiene historial. */
    private void givenNoHistoryCounters() {
        when(answerProposalRepository.findQuestionIdsIn(anyCollection())).thenReturn(List.of());
        when(mockExamQuestionRepository.findQuestionIdsIn(anyCollection())).thenReturn(List.of());
        when(sessionItemRepository.findQuestionIdsIn(anyCollection())).thenReturn(List.of());
    }

    @Test
    @DisplayName("detecta duplicadas con el mismo enunciado normalizado y las mismas opciones")
    void detectsDuplicatesWithNormalizedText() {
        givenNoHistoryCounters();
        givenQuestions(
                question(1L, "¿Qué es la mitosis?"),
                question(2L, "¿que es la  MITOSIS?"),
                question(3L, "Otra pregunta distinta"));

        DuplicateQuestionsResponse response = service.findDuplicates(null);

        assertThat(response.totalGroups()).isEqualTo(1);
        assertThat(response.totalDuplicates()).isEqualTo(1);
        assertThat(response.groups().get(0).keepId()).isEqualTo(1L);
        assertThat(response.groups().get(0).duplicates())
                .extracting(DuplicateQuestionsResponse.DuplicateCandidate::id)
                .containsExactly(2L);
    }

    @Test
    @DisplayName("no considera duplicadas dos preguntas con opciones distintas")
    void keepsQuestionsWithDifferentOptions() {
        Question first = question(1L, "Misma pregunta");
        Question second = TestData.question(2L, "Misma pregunta", mir,
                TestData.option("A", "Otra opción", true),
                TestData.option("B", "Opción B", false));
        givenNoHistoryCounters();
        givenQuestions(first, second);

        DuplicateQuestionsResponse response = service.findDuplicates(null);

        assertThat(response.totalGroups()).isZero();
        assertThat(response.totalDuplicates()).isZero();
        assertThat(response.similarGroups()).hasSize(1);
        assertThat(response.similarGroups().get(0).questionIds()).containsExactlyInAnyOrder(1L, 2L);
    }

    @Test
    @DisplayName("no mezcla preguntas del mismo enunciado en bancos distintos")
    void keepsSameTextInDifferentBanks() {
        Question bir = TestData.question(1L, "Pregunta compartida", mir,
                TestData.option("A", "Opción A", true));
        ExamType eir = TestData.examType(2L, "EIR", "Enfermero Interno Residente");
        Question eirQuestion = TestData.question(2L, "Pregunta compartida", eir,
                TestData.option("A", "Opción A", true));
        givenNoHistoryCounters();
        givenQuestions(bir, eirQuestion);

        DuplicateQuestionsResponse response = service.findDuplicates(null);

        assertThat(response.totalGroups()).isZero();
        assertThat(response.similarGroups()).isEmpty();
    }

    @Test
    @DisplayName("conserva la que tiene explicación")
    void keepsTheQuestionWithExplanation() {
        Question plain = question(1L, "Pregunta");
        Question explained = question(2L, "Pregunta");
        explained.setExplanation("Porque sí");
        givenNoHistoryCounters();
        givenQuestions(plain, explained);

        DuplicateQuestionsResponse response = service.findDuplicates(null);

        assertThat(response.groups().get(0).keepId()).isEqualTo(2L);
        assertThat(response.groups().get(0).keepReason()).contains("explicación");
    }

    @Test
    @DisplayName("a igualdad de datos conserva la más antigua")
    void keepsTheOldestOnTie() {
        givenNoHistoryCounters();
        givenQuestions(question(7L, "Pregunta"), question(3L, "Pregunta"));

        DuplicateQuestionsResponse response = service.findDuplicates(null);

        assertThat(response.groups().get(0).keepId()).isEqualTo(3L);
    }

    @Test
    @DisplayName("filtra por banco al buscar duplicadas")
    void filtersByExamType() {
        givenNoHistoryCounters();
        when(questionRepository.findAllWithOptions("MIR")).thenReturn(List.of(question(1L, "Pregunta")));

        service.findDuplicates("MIR");

        verify(questionRepository).findAllWithOptions("MIR");
    }

    @Test
    @DisplayName("purga borrando la duplicada y re-apuntando el historial")
    void purgeDeletesDuplicateAndRepointsHistory() {
        Question keeper = question(1L, "Pregunta");
        Question duplicate = question(2L, "Pregunta");
        givenQuestions(keeper, duplicate);
        when(answerProposalRepository.findByQuestionIdIn(anyCollection())).thenReturn(List.of());
        when(mockExamQuestionRepository.findByQuestionId(2L)).thenReturn(List.of());
        when(sessionItemRepository.rePointQuestion(2L, 1L)).thenReturn(3);

        DuplicatePurgeResponse response = service.purge(null, 10);

        assertThat(response.groupsProcessed()).isEqualTo(1);
        assertThat(response.deleted()).isEqualTo(1);
        assertThat(response.sessionItemsRepointed()).isEqualTo(3);
        assertThat(response.remaining()).isZero();
        verify(questionRepository).delete(duplicate);
        verify(questionRepository, never()).delete(keeper);
    }

    @Test
    @DisplayName("re-apunta las apariciones en simulacros al conservado")
    void rePointsMockExams() {
        Question keeper = question(1L, "Pregunta");
        Question duplicate = question(2L, "Pregunta");
        givenQuestions(keeper, duplicate);

        MockExam exam = TestData.mockExam(10L, "Simulacro", mir, duplicate);
        MockExamQuestion link = exam.getQuestions().get(0);
        when(mockExamQuestionRepository.findByQuestionId(2L)).thenReturn(List.of(link));
        when(mockExamQuestionRepository.findByQuestionId(1L)).thenReturn(List.of());
        when(answerProposalRepository.findByQuestionIdIn(anyCollection())).thenReturn(List.of());

        DuplicatePurgeResponse response = service.purge(null, 10);

        assertThat(response.mockExamLinksRepointed()).isEqualTo(1);
        assertThat(link.getQuestion()).isSameAs(keeper);
        verify(mockExamQuestionRepository).update(link);
    }

    @Test
    @DisplayName("quita la aparición duplicada y renumera si el simulacro ya tiene la conservada")
    void removesDuplicateFromMockExamAlreadyContainingKeeper() {
        Question keeper = question(1L, "Pregunta");
        Question duplicate = question(2L, "Pregunta");
        givenQuestions(keeper, duplicate);

        MockExam exam = TestData.mockExam(10L, "Simulacro", mir, keeper, duplicate);
        MockExamQuestion duplicateLink = exam.getQuestions().get(1);
        when(mockExamQuestionRepository.findByQuestionId(2L)).thenReturn(List.of(duplicateLink));
        when(mockExamQuestionRepository.findByQuestionId(1L)).thenReturn(List.of(exam.getQuestions().get(0)));
        when(answerProposalRepository.findByQuestionIdIn(anyCollection())).thenReturn(List.of());

        DuplicatePurgeResponse response = service.purge(null, 10);

        assertThat(response.mockExamLinksRemoved()).isEqualTo(1);
        assertThat(response.positionsRenumbered()).isEqualTo(1);
        verify(mockExamQuestionRepository).delete(duplicateLink);
        verify(mockExamQuestionRepository).shiftPositionsAfter(eq(10L), eq(2));
        verify(mockExamQuestionRepository, never()).update(any());
    }

    @Test
    @DisplayName("re-apunta las propuestas de respuesta al conservado")
    void rePointsProposals() {
        Question keeper = question(1L, "Pregunta");
        Question duplicate = question(2L, "Pregunta");
        givenQuestions(keeper, duplicate);

        AnswerProposal proposal = proposal(100L, duplicate, 5L);
        when(answerProposalRepository.findByQuestionIdIn(anyCollection())).thenReturn(List.of(proposal));
        when(mockExamQuestionRepository.findByQuestionId(2L)).thenReturn(List.of());

        DuplicatePurgeResponse response = service.purge(null, 10);

        assertThat(response.proposalsRepointed()).isEqualTo(1);
        assertThat(proposal.getQuestion()).isSameAs(keeper);
        verify(answerProposalRepository).update(proposal);
    }

    @Test
    @DisplayName("borra la propuesta duplicada si el usuario ya propuso sobre el conservado")
    void deletesProposalWhenUserAlreadyProposedOnKeeper() {
        Question keeper = question(1L, "Pregunta");
        Question duplicate = question(2L, "Pregunta");
        givenQuestions(keeper, duplicate);

        AnswerProposal keeperProposal = proposal(99L, keeper, 5L);
        AnswerProposal duplicateProposal = proposal(100L, duplicate, 5L);
        when(answerProposalRepository.findByQuestionIdIn(anyCollection()))
                .thenReturn(List.of(keeperProposal, duplicateProposal));
        when(mockExamQuestionRepository.findByQuestionId(2L)).thenReturn(List.of());

        DuplicatePurgeResponse response = service.purge(null, 10);

        assertThat(response.proposalsDeleted()).isEqualTo(1);
        assertThat(response.proposalsRepointed()).isZero();
        verify(answerProposalRepository).delete(duplicateProposal);
        verify(answerProposalRepository, never()).update(duplicateProposal);
    }

    @Test
    @DisplayName("una segunda pasada no encuentra nada que borrar")
    void isIdempotent() {
        givenQuestions(question(1L, "Pregunta"));

        DuplicatePurgeResponse response = service.purge(null, 10);

        assertThat(response.groupsProcessed()).isZero();
        assertThat(response.deleted()).isZero();
        assertThat(response.remaining()).isZero();
        verify(questionRepository, never()).delete(any());
    }

    @Test
    @DisplayName("procesa como mucho maxGroups y devuelve cuántos quedan")
    void limitsGroupsAndReportsRemaining() {
        List<Question> questions = new ArrayList<>();
        for (long id = 1; id <= 6; id += 2) {
            questions.add(question(id, "Pregunta " + id));
            questions.add(question(id + 1, "Pregunta " + id));
        }
        givenQuestions(questions.toArray(Question[]::new));
        when(answerProposalRepository.findByQuestionIdIn(anyCollection())).thenReturn(List.of());
        when(mockExamQuestionRepository.findByQuestionId(any())).thenReturn(List.of());

        DuplicatePurgeResponse response = service.purge(null, 2);

        assertThat(response.groupsProcessed()).isEqualTo(2);
        assertThat(response.deleted()).isEqualTo(2);
        assertThat(response.remaining()).isEqualTo(1);
    }

    private AnswerProposal proposal(Long id, Question question, Long userId) {
        var user = TestData.user(userId, "user" + userId, UserRole.USER);
        AnswerProposal proposal = new AnswerProposal();
        proposal.setId(id);
        proposal.setQuestion(question);
        proposal.setProposedBy(user);
        return proposal;
    }
}
