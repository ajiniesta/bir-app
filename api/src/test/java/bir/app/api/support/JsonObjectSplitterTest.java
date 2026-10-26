package bir.app.api.support;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("JsonObjectSplitter")
class JsonObjectSplitterTest {

    @Test
    @DisplayName("trocea objetos concatenados")
    void splitsConcatenatedObjects() {
        assertThat(JsonObjectSplitter.split("{\"a\":1}{\"b\":2}"))
                .containsExactly("{\"a\":1}", "{\"b\":2}");
    }

    @Test
    @DisplayName("ignora los corchetes del array contenedor")
    void ignoresContainerArray() {
        assertThat(JsonObjectSplitter.split("[{\"a\":1},{\"b\":2}]"))
                .containsExactly("{\"a\":1}", "{\"b\":2}");
    }

    @Test
    @DisplayName("no se confunde con llaves dentro de una cadena")
    void ignoresBracesInsideStrings() {
        String content = "{\"text\":\"Usa { y } y \\\" comillas\"}";

        assertThat(JsonObjectSplitter.split(content)).containsExactly(content);
    }

    @Test
    @DisplayName("cuenta los objetos anidados una sola vez")
    void keepsNestedObjectsTogether() {
        String content = "{\"answers\":[{\"letter\":\"A\"},{\"letter\":\"B\"}]}";

        assertThat(JsonObjectSplitter.split(content)).containsExactly(content);
    }

    @Test
    @DisplayName("ignora un objeto incompleto al final")
    void ignoresTruncatedObject() {
        assertThat(JsonObjectSplitter.split("{\"a\":1}{\"b\":"))
                .containsExactly("{\"a\":1}");
    }

    @Test
    @DisplayName("devuelve una lista vacía si no hay objetos")
    void returnsEmptyWhenNoObjects() {
        assertThat(JsonObjectSplitter.split("esto no es json")).isEmpty();
        assertThat(JsonObjectSplitter.split("")).isEmpty();
        assertThat(JsonObjectSplitter.split(null)).isEmpty();
    }
}
