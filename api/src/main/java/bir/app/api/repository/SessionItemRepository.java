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
}
