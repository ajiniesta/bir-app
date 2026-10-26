package bir.app.api.repository;

import bir.app.api.entity.SessionItem;
import io.micronaut.data.annotation.Query;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.repository.JpaRepository;

import java.util.List;

@Repository
public interface SessionItemRepository extends JpaRepository<SessionItem, Long> {

    /**
     * Todas las respuestas dadas por un usuario. Se cargan las entidades y la
     * agregación por tipo de examen se hace en el servicio (evita JPQL con
     * parámetros nulos y proyecciones complejas).
     */
    @Query("SELECT i FROM SessionItem i WHERE i.session.user.username = :username AND i.answeredAt IS NOT NULL")
    List<SessionItem> findAnsweredByUsername(String username);

    @Query("SELECT i FROM SessionItem i WHERE i.answeredAt IS NOT NULL")
    List<SessionItem> findAllAnswered();

    /** Ids de las preguntas (de las indicadas) que aparecen en alguna sesión. */
    @Query("SELECT DISTINCT i.question.id FROM SessionItem i WHERE i.question.id IN (:questionIds)")
    List<Long> findQuestionIdsIn(java.util.Collection<Long> questionIds);

    /**
     * Re-apunta al conservado los ítems de sesiones que apuntaban a la duplicada.
     * El ítem mantiene posición y snapshot ({@code selected_letter}/{@code is_correct}),
     * así que las estadísticas ya jugadas no cambian.
     */
    @Query("UPDATE SessionItem i SET i.question.id = :keepId WHERE i.question.id = :duplicateId")
    int rePointQuestion(Long duplicateId, Long keepId);
}
