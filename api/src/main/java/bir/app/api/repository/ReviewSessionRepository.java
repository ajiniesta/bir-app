package bir.app.api.repository;

import bir.app.api.entity.ReviewSession;
import io.micronaut.data.annotation.Query;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.repository.JpaRepository;

import java.util.List;

@Repository
public interface ReviewSessionRepository extends JpaRepository<ReviewSession, Long> {

    @Query("SELECT s FROM ReviewSession s JOIN FETCH s.examType " +
           "WHERE s.user.username = :username AND s.finishedAt IS NULL " +
           "ORDER BY s.createdAt DESC, s.id DESC")
    List<ReviewSession> findActiveByUsername(String username);

    long countByUserUsername(String username);

    @Query("SELECT COUNT(DISTINCT s.user.id) FROM ReviewSession s")
    long countDistinctUsers();
}
