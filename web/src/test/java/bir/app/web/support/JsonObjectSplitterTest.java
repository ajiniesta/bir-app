package bir.app.web.support;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("JsonObjectSplitter (web)")
class JsonObjectSplitterTest {

    @Test
    @DisplayName("trocea objetos concatenados y arrays contenedores")
    void splitsObjects() {
        assertThat(JsonObjectSplitter.split("{\"a\":1}{\"b\":2}"))
                .containsExactly("{\"a\":1}", "{\"b\":2}");
        assertThat(JsonObjectSplitter.split("[{\"a\":1},{\"b\":2}]"))
                .containsExactly("{\"a\":1}", "{\"b\":2}");
    }

    @Test
    @DisplayName("no cuenta las llaves que hay dentro de una cadena")
    void ignoresBracesInsideStrings() {
        String content = "{\"text\":\"Usa { y } aquí\"}";

        assertThat(JsonObjectSplitter.split(content)).containsExactly(content);
    }

    @Test
    @DisplayName("devuelve vacío si no hay objetos")
    void returnsEmptyWithoutObjects() {
        assertThat(JsonObjectSplitter.split("nada")).isEmpty();
        assertThat(JsonObjectSplitter.split(null)).isEmpty();
    }
}
