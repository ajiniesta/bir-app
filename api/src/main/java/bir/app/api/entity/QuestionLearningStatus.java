package bir.app.api.entity;

/**
 * Estado de dominio de una pregunta para un usuario según su historial de respuestas:
 * <ul>
 *   <li>{@link #KNOWN} (conocida): acertada a la primera, o recuperada tras 3 aciertos seguidos desde duda.</li>
 *   <li>{@link #DOUBT} (en duda): fallada estando en conocida, o acertada estando en fallida (hasta lograr 3 aciertos en las 3 últimas respuestas).</li>
 *   <li>{@link #FAILED} (fallida): fallada desde la primera vez sin haber sido acertada nunca.</li>
 * </ul>
 */
public enum QuestionLearningStatus {
    KNOWN,
    DOUBT,
    FAILED
}
