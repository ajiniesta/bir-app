package bir.app.api.support;

import java.util.ArrayList;
import java.util.List;

/**
 * Trocea el contenido de un fichero de preguntas en sus objetos JSON de primer
 * nivel.
 *
 * <p>Se aceptan objetos concatenados ({@code {...}{...}}), dentro de un array
 * contenedor ({@code [{...},{...}]}) o un único objeto. Las llaves que aparecen
 * dentro de una cadena (por ejemplo en el enunciado) no cuentan, y los objetos
 * incompletos al final del fichero se ignoran. El troceado es independiente del
 * parseo: cada trozo se valida luego por separado, de modo que una pregunta con
 * JSON inválido no impide importar el resto.</p>
 */
public final class JsonObjectSplitter {

    private JsonObjectSplitter() {
    }

    /** Devuelve los objetos JSON de primer nivel, en el orden en que aparecen. */
    public static List<String> split(String content) {
        List<String> chunks = new ArrayList<>();
        if (content == null) {
            return chunks;
        }

        int depth = 0;
        boolean inString = false;
        boolean escaped = false;
        int start = -1;

        for (int i = 0; i < content.length(); i++) {
            char c = content.charAt(i);
            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (c == '\\') {
                    escaped = true;
                } else if (c == '"') {
                    inString = false;
                }
                continue;
            }
            if (c == '"') {
                inString = true;
            } else if (c == '{') {
                if (depth == 0) {
                    start = i;
                }
                depth++;
            } else if (c == '}' && depth > 0) {
                depth--;
                if (depth == 0 && start >= 0) {
                    chunks.add(content.substring(start, i + 1));
                    start = -1;
                }
            }
        }
        return chunks;
    }
}
