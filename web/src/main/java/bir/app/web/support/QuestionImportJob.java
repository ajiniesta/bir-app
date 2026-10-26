package bir.app.web.support;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Lotes pendientes de una importación en curso.
 *
 * <p>El fichero se trocea en el servidor al subirlo y los lotes se guardan en la
 * sesión HTTP: el navegador los va pidiendo de uno en uno (barra de progreso) o,
 * sin JavaScript, se procesan todos con una sola petición. Así ninguna petición
 * dura lo suficiente como para agotar el timeout del cliente HTTP o de un proxy,
 * que era lo que rompía la importación de ficheros grandes.</p>
 *
 * <p>El trabajo se borra de la sesión al terminar. Si se interrumpe, volver a
 * subir el fichero lo reemplaza; las preguntas ya guardadas se saltan como
 * duplicadas y la importación se completa sin repetirlas.</p>
 */
public record QuestionImportJob(String id, List<String> batches, int totalQuestions) {

    public QuestionImportJob {
        batches = batches == null ? List.of() : List.copyOf(batches);
    }

    /** Número de lotes que hay que procesar. */
    public int totalBatches() {
        return batches.size();
    }

    /** Contenido del lote indicado (0-based), si el índice es válido. */
    public Optional<String> batch(int index) {
        if (index < 0 || index >= batches.size()) {
            return Optional.empty();
        }
        return Optional.of(batches.get(index));
    }

    /** Trocea una lista de objetos JSON en lotes de tamaño fijo. */
    public static QuestionImportJob of(List<String> objects, int batchSize) {
        List<String> batches = new ArrayList<>();
        for (int i = 0; i < objects.size(); i += batchSize) {
            batches.add(String.join("\n", objects.subList(i, Math.min(objects.size(), i + batchSize))));
        }
        return new QuestionImportJob(UUID.randomUUID().toString(), batches, objects.size());
    }
}
