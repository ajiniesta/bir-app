package bir.app.api.service;

import bir.app.api.dto.QuestionStatsResponse;
import bir.app.api.dto.StatsOverviewResponse;
import bir.app.api.entity.AppUser;
import bir.app.api.entity.ExamType;
import bir.app.api.entity.FreeSession;
import bir.app.api.entity.MockExamAttempt;
import bir.app.api.entity.MockExamAttemptItem;
import bir.app.api.entity.Question;
import bir.app.api.entity.ReviewSession;
import bir.app.api.entity.ReviewSessionItem;
import bir.app.api.entity.SessionItem;
import bir.app.api.entity.UserRole;
import bir.app.api.repository.FreeSessionRepository;
import bir.app.api.repository.MockExamAttemptItemRepository;
import bir.app.api.repository.MockExamAttemptRepository;
import bir.app.api.repository.QuestionRepository;
import bir.app.api.repository.ReviewSessionItemRepository;
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
import java.util.NoSuchElementException;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
    ReviewSessionItemRepository reviewSessionItemRepository;
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

    private static MockExamAttemptItem invalidatedMockItem(AppUser user, String category) {
        MockExamAttempt attempt = new MockExamAttempt();
        attempt.setId(2L);
        attempt.setUser(user);
        attempt.setTotalQuestions(1);
        attempt.setFinishedAt(LocalDateTime.now());
        MockExamAttemptItem item = new MockExamAttemptItem();
        item.setAttempt(attempt);
        item.setPosition(1);
        item.setQuestionText("Pregunta invalidada de simulacro");
        item.setCorrectLetter(null);
        item.setCategory(category);
        item.setSelectedLetter("A");
        item.setAnsweredAt(LocalDateTime.now());
        item.setIsCorrect(null);
        return item;
    }

    private static ReviewSessionItem reviewItem(AppUser user, String category, boolean correct) {
        ExamType examType = TestData.examType(1L, "MIR", "MIR");
        Question question = TestData.question(1L, "Pregunta repaso", examType,
                TestData.option("A", "Opción A", true),
                TestData.option("B", "Opción B", false));
        question.setCategory(category);
        ReviewSession session = new ReviewSession();
        session.setId(1L);
        session.setUser(user);
        session.setExamType(examType);
        ReviewSessionItem item = new ReviewSessionItem();
        item.setSession(session);
        item.setQuestion(question);
        item.setPosition(1);
        item.setSelectedLetter(correct ? "A" : "B");
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
                mockItem(user, "Bioquímica", true, false),
                invalidatedMockItem(user, "Biología")));
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

    @Test
    @DisplayName("questionStats calcula veces respondida y porcentaje de acierto en toda la plataforma y del usuario autenticado")
    void questionStatsCalculatesPlatformAndUserTotalsAndAccuracy() {
        AppUser demo = TestData.user(1L, "demo", UserRole.USER);
        AppUser other = TestData.user(2L, "otro", UserRole.USER);

        when(questionRepository.existsById(42L)).thenReturn(true);
        when(sessionItemRepository.findAnsweredByQuestionId(42L)).thenReturn(List.of(
                freeItem(demo, "Neurobiología", true),
                freeItem(demo, "Neurobiología", false),
                freeItem(other, "Neurobiología", true),
                freeItem(other, "Neurobiología", true)
        ));
        when(mockExamAttemptItemRepository.findAnsweredFinishedByQuestionId(42L)).thenReturn(List.of(
                mockItem(demo, "Neurobiología", true, true),
                mockItem(other, "Neurobiología", false, true),
                mockItem(demo, "Neurobiología", false, false) // intento abierto: no debe contar
        ));

        QuestionStatsResponse stats = service.questionStats(42L, "demo");

        assertThat(stats.questionId()).isEqualTo(42L);
        // Plataforma: 4 en modo libre + 2 en simulacros entregados = 6 respondidas, 4 acertadas (66.7%)
        assertThat(stats.platform().answered()).isEqualTo(6L);
        assertThat(stats.platform().correct()).isEqualTo(4L);
        assertThat(stats.platform().incorrect()).isEqualTo(2L);
        assertThat(stats.platform().accuracy()).isEqualTo(66.7d);

        // Usuario "demo": 2 en modo libre (1 ok, 1 fallo) + 1 en simulacro entregado (1 ok) = 3 respondidas, 2 acertadas (66.7%)
        assertThat(stats.user().answered()).isEqualTo(3L);
        assertThat(stats.user().correct()).isEqualTo(2L);
        assertThat(stats.user().incorrect()).isEqualTo(1L);
        assertThat(stats.user().accuracy()).isEqualTo(66.7d);
    }

    @Test
    @DisplayName("questionStats devuelve contadores a cero cuando la pregunta aún no se ha respondido")
    void questionStatsReturnsZerosWhenNeverAnswered() {
        when(questionRepository.existsById(42L)).thenReturn(true);
        when(sessionItemRepository.findAnsweredByQuestionId(42L)).thenReturn(List.of());
        when(mockExamAttemptItemRepository.findAnsweredFinishedByQuestionId(42L)).thenReturn(List.of());

        QuestionStatsResponse stats = service.questionStats(42L, "demo");

        assertThat(stats.questionId()).isEqualTo(42L);
        assertThat(stats.platform().answered()).isZero();
        assertThat(stats.platform().correct()).isZero();
        assertThat(stats.platform().incorrect()).isZero();
        assertThat(stats.platform().accuracy()).isZero();
        assertThat(stats.user().answered()).isZero();
        assertThat(stats.user().correct()).isZero();
        assertThat(stats.user().incorrect()).isZero();
        assertThat(stats.user().accuracy()).isZero();
    }

    @Test
    @DisplayName("questionStats lanza NoSuchElementException si la pregunta no existe")
    void questionStatsThrowsWhenQuestionDoesNotExist() {
        when(questionRepository.existsById(999L)).thenReturn(false);

        assertThatThrownBy(() -> service.questionStats(999L, "demo"))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("999");
    }

    @Test
    @DisplayName("suma las respuestas del modo repaso en overview (totales, byCategory y global) y en questionStats")
    void includesReviewSessionItemsInOverviewAndQuestionStats() {
        StatisticsService serviceWithReviews = new StatisticsService(
                freeSessionRepository,
                sessionItemRepository,
                mockExamAttemptRepository,
                mockExamAttemptItemRepository,
                reviewSessionItemRepository,
                questionRepository,
                accessControlService);

        AppUser admin = TestData.user(1L, "admin", UserRole.ADMIN);
        AppUser demo = TestData.user(2L, "demo", UserRole.USER);

        when(freeSessionRepository.countByUserUsername("admin")).thenReturn(1L);
        when(mockExamAttemptRepository.countFinishedByUsername("admin")).thenReturn(1L);
        when(sessionItemRepository.findAnsweredByUsername("admin")).thenReturn(List.of(
                freeItem(admin, "Anatomía", true)));
        when(mockExamAttemptItemRepository.findAnsweredFinishedByUsername("admin")).thenReturn(List.of(
                mockItem(admin, "Anatomía", false, true)));
        when(reviewSessionItemRepository.findAnsweredByUsername("admin")).thenReturn(List.of(
                reviewItem(admin, "Anatomía", true),
                reviewItem(admin, "Genética", false)));

        when(sessionItemRepository.findAllAnswered()).thenReturn(List.of(
                freeItem(admin, "Anatomía", true)));
        when(mockExamAttemptItemRepository.findAllAnsweredFinished()).thenReturn(List.of(
                mockItem(admin, "Anatomía", false, true)));
        when(reviewSessionItemRepository.findAllAnswered()).thenReturn(List.of(
                reviewItem(admin, "Anatomía", true),
                reviewItem(demo, "Genética", true)));

        when(freeSessionRepository.count()).thenReturn(1L);
        when(mockExamAttemptRepository.countFinished()).thenReturn(1L);
        when(accessControlService.hasGlobalBankAccess("admin")).thenReturn(true);
        when(questionRepository.findDistinctCategories()).thenReturn(List.of("Anatomía", "Genética"));

        StatsOverviewResponse overview = serviceWithReviews.overview("admin");

        // Personal (admin): 1 libre (ok) + 1 simulacro (fallo) + 2 repaso (1 ok, 1 fallo) = 4 respondidas, 2 acertadas (50%)
        assertThat(overview.mine().answered()).isEqualTo(4L);
        assertThat(overview.mine().correct()).isEqualTo(2L);
        assertThat(overview.mine().accuracy()).isEqualTo(50d);
        assertThat(overview.mine().byCategory())
                .filteredOn(c -> c.category().equals("Anatomía"))
                .singleElement()
                .satisfies(c -> {
                    assertThat(c.answered()).isEqualTo(3L);
                    assertThat(c.correct()).isEqualTo(2L);
                });
        assertThat(overview.mine().byCategory())
                .filteredOn(c -> c.category().equals("Genética"))
                .singleElement()
                .satisfies(c -> {
                    assertThat(c.answered()).isEqualTo(1L);
                    assertThat(c.correct()).isZero();
                });

        // Global: admin (3 respondidas, 2 acertadas) + demo (1 en repaso, 1 acertada) = 2 usuarios, 4 respondidas, 3 acertadas (75%)
        assertThat(overview.global()).isNotNull();
        assertThat(overview.global().users()).isEqualTo(2L);
        assertThat(overview.global().answered()).isEqualTo(4L);
        assertThat(overview.global().correct()).isEqualTo(3L);
        assertThat(overview.global().accuracy()).isEqualTo(75d);
        assertThat(overview.global().byUser())
                .extracting(StatsOverviewResponse.UserStats::username)
                .containsExactly("admin", "demo");

        // questionStats con ReviewSessionItem
        when(questionRepository.existsById(42L)).thenReturn(true);
        when(sessionItemRepository.findAnsweredByQuestionId(42L)).thenReturn(List.of(
                freeItem(admin, "Anatomía", true)));
        when(mockExamAttemptItemRepository.findAnsweredFinishedByQuestionId(42L)).thenReturn(List.of());
        when(reviewSessionItemRepository.findAnsweredByQuestionId(42L)).thenReturn(List.of(
                reviewItem(admin, "Anatomía", false),
                reviewItem(demo, "Anatomía", true)));

        QuestionStatsResponse qStats = serviceWithReviews.questionStats(42L, "admin");

        assertThat(qStats.platform().answered()).isEqualTo(3L);
        assertThat(qStats.platform().correct()).isEqualTo(2L);
        assertThat(qStats.platform().incorrect()).isEqualTo(1L);
        assertThat(qStats.user().answered()).isEqualTo(2L);
        assertThat(qStats.user().correct()).isEqualTo(1L);
        assertThat(qStats.user().incorrect()).isEqualTo(1L);
        assertThat(qStats.user().accuracy()).isEqualTo(50d);
    }
}
