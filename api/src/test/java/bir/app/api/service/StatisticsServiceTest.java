package bir.app.api.service;

import bir.app.api.dto.StatsOverviewResponse;
import bir.app.api.entity.AppUser;
import bir.app.api.entity.ExamType;
import bir.app.api.entity.FreeSession;
import bir.app.api.entity.MockExamAttempt;
import bir.app.api.entity.MockExamAttemptItem;
import bir.app.api.entity.Question;
import bir.app.api.entity.SessionItem;
import bir.app.api.entity.UserRole;
import bir.app.api.repository.FreeSessionRepository;
import bir.app.api.repository.MockExamAttemptItemRepository;
import bir.app.api.repository.MockExamAttemptRepository;
import bir.app.api.repository.QuestionRepository;
import bir.app.api.repository.SessionItemRepository;
import bir.app.api.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("StatisticsService")
class StatisticsServiceTest {

    @Mock
    FreeSessionRepository freeSessionRepository;
    @Mock
    SessionItemRepository sessionItemRepository;
    @Mock
    MockExamAttemptRepository mockExamAttemptRepository;
    @Mock
    MockExamAttemptItemRepository mockExamAttemptItemRepository;
    @Mock
    QuestionRepository questionRepository;
    @Mock
    AccessControlService accessControlService;

    StatisticsService service;

    @BeforeEach
    void setUp() {
        service = new StatisticsService(freeSessionRepository, sessionItemRepository,
                mockExamAttemptRepository, mockExamAttemptItemRepository,
                questionRepository, accessControlService);
    }

    private static SessionItem freeItem(AppUser user, String category, boolean correct) {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        Question question = TestData.question(1L, "Pregunta", examType,
                TestData.option("A", "Opción A", true),
                TestData.option("B", "Opción B", false));
        question.setCategory(category);
        FreeSession session = TestData.freeSession(1L, user, examType, null, null, question);
        SessionItem item = session.getItems().get(0);
        item.setAnsweredAt(LocalDateTime.now());
        item.setIsCorrect(correct);
        return item;
    }

    private static MockExamAttemptItem mockItem(AppUser user, String category,
                                                boolean correct, boolean finished) {
        MockExamAttempt attempt = new MockExamAttempt();
        attempt.setId(1L);
        attempt.setUser(user);
        attempt.setTotalQuestions(1);
        if (finished) {
            attempt.setFinishedAt(LocalDateTime.now());
        }
        MockExamAttemptItem item = new MockExamAttemptItem();
        item.setAttempt(attempt);
        item.setPosition(1);
        item.setQuestionText("Pregunta de simulacro");
        item.setCorrectLetter("A");
        item.setCategory(category);
        item.setAnsweredAt(LocalDateTime.now());
        item.setIsCorrect(correct);
        return item;
    }

    @Test
    @DisplayName("combina modo libre y simulacros entregados y añade categorías sin respuestas")
    void combinesFreeAndMockByCategory() {
        AppUser user = TestData.user(1L, "demo", UserRole.USER);
        when(freeSessionRepository.countByUserUsername("demo")).thenReturn(2L);
        when(mockExamAttemptRepository.countFinishedByUsername("demo")).thenReturn(1L);
        when(sessionItemRepository.findAnsweredByUsername("demo")).thenReturn(List.of(
                freeItem(user, "Anatomía", true),
                freeItem(user, "anatomía", false),
                freeItem(user, "Fisiología", true)));
        when(mockExamAttemptItemRepository.findAnsweredFinishedByUsername("demo")).thenReturn(List.of(
                mockItem(user, "Biología", true, true),
                mockItem(user, null, false, true),
                mockItem(user, "Bioquímica", true, false)));
        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(false);
        when(accessControlService.allowedBankCodes("demo")).thenReturn(Set.of("MIR"));
        when(questionRepository.findDistinctCategoriesByExamTypeCodeIn(anySet())).thenReturn(
                List.of("Anatomía", "Bioquímica", "Fisiología"));

        StatsOverviewResponse response = service.overview("demo");

        assertThat(response.global()).isNull();
        StatsOverviewResponse.Summary mine = response.mine();
        assertThat(mine.freeSessions()).isEqualTo(2);
        assertThat(mine.mockAttempts()).isEqualTo(1);
        assertThat(mine.answered()).isEqualTo(5);
        assertThat(mine.correct()).isEqualTo(3);
        assertThat(mine.accuracy()).isEqualTo(60d);

        assertThat(mine.byCategory())
                .extracting(StatsOverviewResponse.CategoryStats::category)
                .containsExactly("Anatomía", "Biología", "Bioquímica", "Fisiología", "Sin categoría");
        assertThat(mine.byCategory())
                .filteredOn(c -> c.category().equals("Anatomía"))
                .singleElement()
                .satisfies(c -> {
                    assertThat(c.answered()).isEqualTo(2);
                    assertThat(c.correct()).isEqualTo(1);
                    assertThat(c.accuracy()).isEqualTo(50d);
                });
        assertThat(mine.byCategory())
                .filteredOn(c -> c.category().equals("Bioquímica"))
                .singleElement()
                .satisfies(c -> {
                    assertThat(c.answered()).isZero();
                    assertThat(c.accuracy()).isZero();
                });
    }

    @Test
    @DisplayName("ADMIN y CREATOR reciben los totales globales y el desglose por usuario")
    void adminReceivesGlobalStats() {
        AppUser admin = TestData.user(1L, "admin", UserRole.ADMIN);
        AppUser demo = TestData.user(2L, "demo", UserRole.USER);
        when(sessionItemRepository.findAnsweredByUsername("admin")).thenReturn(List.of(
                freeItem(admin, "Anatomía", true)));
        when(mockExamAttemptItemRepository.findAnsweredFinishedByUsername("admin")).thenReturn(List.of(
                mockItem(admin, "Anatomía", false, true)));
        when(sessionItemRepository.findAllAnswered()).thenReturn(List.of(
                freeItem(admin, "Anatomía", true),
                freeItem(demo, "Fisiología", true),
                freeItem(demo, "Fisiología", false)));
        when(mockExamAttemptItemRepository.findAllAnsweredFinished()).thenReturn(List.of(
                mockItem(demo, "Anatomía", true, true)));
        when(freeSessionRepository.count()).thenReturn(4L);
        when(mockExamAttemptRepository.countFinished()).thenReturn(2L);
        when(accessControlService.hasGlobalBankAccess("admin")).thenReturn(true);
        when(questionRepository.findDistinctCategories()).thenReturn(List.of("Anatomía", "Fisiología"));

        StatsOverviewResponse response = service.overview("admin");

        assertThat(response.global()).isNotNull();
        StatsOverviewResponse.Global global = response.global();
        assertThat(global.users()).isEqualTo(2);
        assertThat(global.freeSessions()).isEqualTo(4);
        assertThat(global.mockAttempts()).isEqualTo(2);
        assertThat(global.answered()).isEqualTo(4);
        assertThat(global.correct()).isEqualTo(3);
        assertThat(global.accuracy()).isEqualTo(75d);
        assertThat(global.byCategory())
                .extracting(StatsOverviewResponse.CategoryStats::category)
                .containsExactly("Anatomía", "Fisiología");
        assertThat(global.byUser())
                .extracting(StatsOverviewResponse.UserStats::username)
                .containsExactly("demo", "admin");
        assertThat(global.byUser())
                .filteredOn(u -> u.username().equals("demo"))
                .singleElement()
                .satisfies(u -> {
                    assertThat(u.answered()).isEqualTo(3);
                    assertThat(u.correct()).isEqualTo(2);
                    assertThat(u.accuracy()).isEqualTo(66.7d);
                });
    }

    @Test
    @DisplayName("un USER sin bancos asignados sigue viendo sus categorías históricas")
    void userWithoutBanksKeepsHistoricalCategories() {
        AppUser user = TestData.user(1L, "demo", UserRole.USER);
        when(sessionItemRepository.findAnsweredByUsername("demo")).thenReturn(List.of(
                freeItem(user, "Anatomía", true)));
        when(mockExamAttemptItemRepository.findAnsweredFinishedByUsername("demo")).thenReturn(List.of());
        when(accessControlService.hasGlobalBankAccess("demo")).thenReturn(false);
        when(accessControlService.allowedBankCodes("demo")).thenReturn(Set.of());

        StatsOverviewResponse response = service.overview("demo");

        assertThat(response.global()).isNull();
        assertThat(response.mine().byCategory())
                .extracting(StatsOverviewResponse.CategoryStats::category)
                .containsExactly("Anatomía");
        verify(questionRepository, never()).findDistinctCategoriesByExamTypeCodeIn(anySet());
    }
}
