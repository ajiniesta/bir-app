package bir.app.api.entity;

/**
 * Rol de un usuario. Cada usuario tiene exactamente un rol.
 * <ul>
 *   <li>{@link #ADMIN} — puede todo y gestiona usuarios, roles y bancos.</li>
 *   <li>{@link #CREATOR} — crea/edita/borra preguntas y resuelve en cualquier banco.</li>
 *   <li>{@link #USER} — solo resuelve preguntas de los bancos que le asigne un admin.</li>
 * </ul>
 */
public enum UserRole {
    ADMIN,
    CREATOR,
    USER;

    /** Nombre de la authority que usa micronaut-security ({@code ROLE_...}). */
    public String authority() {
        return "ROLE_" + name();
    }
}
