package bir.app.web.support;

import io.micronaut.session.Session;
import jakarta.inject.Singleton;

import java.util.List;
import java.util.Optional;

/**
 * Guarda en la sesión HTTP los lotes de la importación en curso.
 *
 * <p>Solo hay una importación a la vez por sesión (el formulario siempre empieza
 * una nueva, que reemplaza la anterior). El tamaño de lote por defecto hace que
 * cada petición a la API tarde muy poco, incluso con cientos de preguntas.</p>
 */
@Singleton
public class QuestionImportStore {

    /** Objetos JSON por petición a la API. */
    public static final int BATCH_SIZE = 100;

    private static final String ATTRIBUTE = "questionImportJob";

    /**
     * Trocea el fichero y deja el trabajo en la sesión.
     *
     * @return el trabajo creado, o vacío si el fichero no contiene objetos JSON
     */
    public Optional<QuestionImportJob> start(Session session, String rawContent) {
        List<String> objects = JsonObjectSplitter.split(rawContent);
        if (objects.isEmpty()) {
            return Optional.empty();
        }
        QuestionImportJob job = QuestionImportJob.of(objects, BATCH_SIZE);
        session.put(ATTRIBUTE, job);
        return Optional.of(job);
    }

    /** Recupera el trabajo de la sesión, comprobando que el id coincide. */
    public Optional<QuestionImportJob> find(Session session, String importId) {
        if (importId == null) {
            return Optional.empty();
        }
        Object stored = session.get(ATTRIBUTE).orElse(null);
        if (stored instanceof QuestionImportJob job && job.id().equals(importId)) {
            return Optional.of(job);
        }
        return Optional.empty();
    }

    /** Olvida el trabajo en curso (al terminar o al cancelar). */
    public void clear(Session session) {
        session.remove(ATTRIBUTE);
    }
}
