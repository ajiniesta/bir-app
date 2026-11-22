package bir.app.api.support;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Utilidad para gestionar múltiples tags en una pregunta.
 *
 * <p>Permite desglosar tanto la columna {@code tag} (tags separadas por comas)
 * como listas {@code tags}, recortando espacios, descartando vacíos y
 * eliminando duplicados sin distinguir mayúsculas/minúsculas (conservando la
 * primera grafía encontrada).</p>
 */
public final class QuestionTagSupport {

    public static final int MAX_TAG_LENGTH = 100;

    private QuestionTagSupport() {
    }

    public static List<String> parse(String rawTag) {
        return parse(rawTag, null);
    }

    public static List<String> parse(String rawTag, Collection<String> rawTags) {
        Map<String, String> unique = new LinkedHashMap<>();
        addTokens(unique, rawTag);
        if (rawTags != null) {
            for (String item : rawTags) {
                addTokens(unique, item);
            }
        }
        if (unique.isEmpty()) {
            return List.of();
        }
        return List.copyOf(new ArrayList<>(unique.values()));
    }

    public static String join(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return null;
        }
        List<String> normalized = parse(null, tags);
        if (normalized.isEmpty()) {
            return null;
        }
        return String.join(", ", normalized);
    }

    public static String normalize(String rawTag, Collection<String> rawTags) {
        List<String> parsed = parse(rawTag, rawTags);
        return parsed.isEmpty() ? null : String.join(", ", parsed);
    }

    public static boolean containsTag(String questionTag, String targetTag) {
        if (questionTag == null || questionTag.isBlank() || targetTag == null || targetTag.isBlank()) {
            return false;
        }
        String needle = targetTag.trim();
        for (String t : parse(questionTag)) {
            if (t.equalsIgnoreCase(needle)) {
                return true;
            }
        }
        return false;
    }

    private static void addTokens(Map<String, String> unique, String raw) {
        if (raw == null || raw.isBlank()) {
            return;
        }
        for (String part : raw.split(",")) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                String key = trimmed.toLowerCase(Locale.ROOT);
                unique.putIfAbsent(key, trimmed);
            }
        }
    }
}
