package bir.app.api.support;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("QuestionTextNormalizer")
class QuestionTextNormalizerTest {

    @Test
    @DisplayName("quita acentos y pasa a minúsculas")
    void removesAccentsAndLowercases() {
        assertThat(QuestionTextNormalizer.normalize("¿QUÉ es la Mitósis?"))
                .isEqualTo("¿que es la mitosis?");
    }

    @Test
    @DisplayName("colapsa espacios y recorta los extremos")
    void collapsesSpaces() {
        assertThat(QuestionTextNormalizer.normalize("  una   pregunta \n con  espacios "))
                .isEqualTo("una pregunta con espacios");
    }

    @Test
    @DisplayName("mantiene la eñe como n")
    void normalizesSpanishCharacters() {
        assertThat(QuestionTextNormalizer.normalize("España")).isEqualTo("espana");
    }

    @Test
    @DisplayName("trata null y vacío como cadena vacía")
    void handlesNullAndBlank() {
        assertThat(QuestionTextNormalizer.normalize(null)).isEmpty();
        assertThat(QuestionTextNormalizer.normalize("   ")).isEmpty();
    }
}
