package bir.app.api.support;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("QuestionTagSupport")
class QuestionTagSupportTest {

    @Test
    @DisplayName("parse desglosa cadena separada por comas, recorta espacios y deduplica sin distinguir mayúsculas")
    void parsesCommaSeparatedString() {
        List<String> tags = QuestionTagSupport.parse("  Tema 1 , Fisiología, tema 1 ,  , Anatomía  ");

        assertThat(tags).containsExactly("Tema 1", "Fisiología", "Anatomía");
    }

    @Test
    @DisplayName("parse combina el campo tag legado y la lista tags manteniendo el orden y sin duplicados")
    void combinesRawTagAndTagList() {
        List<String> tags = QuestionTagSupport.parse(
                "Tema 1, Bioquímica",
                List.of("bioquímica", "Genética, Biología Molecular", "  "));

        assertThat(tags).containsExactly("Tema 1", "Bioquímica", "Genética", "Biología Molecular");
    }

    @Test
    @DisplayName("parse devuelve lista vacía cuando las entradas son nulas o en blanco")
    void returnsEmptyListForNullOrBlank() {
        assertThat(QuestionTagSupport.parse(null, null)).isEmpty();
        assertThat(QuestionTagSupport.parse("   ,  ", List.of("", "  "))).isEmpty();
    }

    @Test
    @DisplayName("join une las tags con coma y espacio o devuelve null si no hay ninguna")
    void joinsTagsOrReturnsNull() {
        assertThat(QuestionTagSupport.join(List.of())).isNull();
        assertThat(QuestionTagSupport.join(null)).isNull();
        assertThat(QuestionTagSupport.join(List.of("Tema 1", "Fisiología"))).isEqualTo("Tema 1, Fisiología");
    }

    @Test
    @DisplayName("containsTag comprueba coincidencia exacta de tag individual sin distinguir mayúsculas")
    void checksContainsTagCaseInsensitively() {
        String stored = "Tema 1, Fisiología";

        assertThat(QuestionTagSupport.containsTag(stored, "tema 1")).isTrue();
        assertThat(QuestionTagSupport.containsTag(stored, "FISIOLOGÍA")).isTrue();
        assertThat(QuestionTagSupport.containsTag(stored, "Tema")).isFalse();
        assertThat(QuestionTagSupport.containsTag(stored, "Tema 10")).isFalse();
        assertThat(QuestionTagSupport.containsTag(null, "Tema 1")).isFalse();
    }
}
