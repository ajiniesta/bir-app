package bir.app.web.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("MockExamForm")
class MockExamFormTest {

    @Test
    @DisplayName("normaliza questionIds nulo a lista vacía")
    void nullQuestionIdsBecomeEmptyList() {
        MockExamForm form = new MockExamForm("Título", "Descripción", 1L, null);

        assertThat(form.questionIds()).isEmpty();
    }

    @Test
    @DisplayName("la petición a la API conserva el orden de las preguntas")
    void toApiRequestKeepsOrder() {
        MockExamForm form = new MockExamForm("Título", "Descripción", 1L, List.of(9L, 3L, 7L));

        CreateMockExamRequest request = form.toApiRequest();

        assertThat(request.title()).isEqualTo("Título");
        assertThat(request.description()).isEqualTo("Descripción");
        assertThat(request.examTypeId()).isEqualTo(1L);
        assertThat(request.questionIds()).containsExactly(9L, 3L, 7L);
    }
}
