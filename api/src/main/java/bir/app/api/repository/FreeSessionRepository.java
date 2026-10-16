package bir.app.api.repository;

import bir.app.api.entity.FreeSession;
import io.micronaut.data.annotation.Query;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.repository.JpaRepository;

@Repository
public interface FreeSessionRepository extends JpaRepository<FreeSession, Long> {

    long countByUserUsername(String username);

    @Query("SELECT COUNT(DISTINCT s.user.id) FROM FreeSession s")
    long countDistinctUsers();
}
