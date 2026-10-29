package bir.app.api.repository;

import bir.app.api.entity.MockExamAttemptItem;
import io.micronaut.data.annotation.Query;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.repository.JpaRepository;

import java.util.List;

@Repository
public interface MockExamAttemptItemRepository extends JpaRepository<MockExamAttemptItem, Long> {

    /**
     * Respuestas de un usuario en simulacros ya entregados. Solo esos intentos
     * cuentan para las estadísticas: mientras están abiertos las respuestas son
     * provisionales.
     */
    @Query("SELECT i FROM MockExamAttemptItem i " +
           "JOIN FETCH i.attempt a JOIN FETCH a.user u " +
           "WHERE u.username = :username AND a.finishedAt IS NOT NULL AND i.answeredAt IS NOT NULL")
    List<MockExamAttemptItem> findAnsweredFinishedByUsername(String username);

    /** Todas las respuestas de simulacros entregados (vista global de ADMIN/CREATOR). */
    @Query("SELECT i FROM MockExamAttemptItem i " +
           "JOIN FETCH i.attempt a JOIN FETCH a.user " +
           "WHERE a.finishedAt IS NOT NULL AND i.answeredAt IS NOT NULL")
    List<MockExamAttemptItem> findAllAnsweredFinished();
}
