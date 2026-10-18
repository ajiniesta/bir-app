package bir.app.api.exception;

/**
 * El usuario autenticado no tiene permiso para realizar la operación
 * (p. ej. un usuario normal intentando un banco de preguntas no asignado).
 */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
