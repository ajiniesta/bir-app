package bir.app.api.support;

import java.text.Normalizer;
import java.util.Locale;

/**
 * Normaliza los textos de las preguntas para poder compararlos.
 *
 * <p>Se usa tanto al importar (para no repetir preguntas) como en la limpieza de
 * duplicados, de modo que ambos procesos consideren "iguales" exactamente las
 * mismas cadenas: minúsculas, sin acentos y con los espacios colapsados. Así
 * "¿Qué es la mitosis?" y "¿que es la  MITOSIS?" son la misma pregunta.</p>
 */
public final class QuestionTextNormalizer {

    private QuestionTextNormalizer() {
    }

    /** Texto comparable: sin acentos, en minúsculas y con espacios colapsados. */
    public static String normalize(String value) {
        if (value == null) {
            return "";
        }
        String withoutAccents = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return withoutAccents.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }
}
