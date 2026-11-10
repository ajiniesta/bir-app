package bir.app.api.repository;

import bir.app.api.entity.AppUser;
import io.micronaut.data.annotation.Query;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.annotation.EntityGraph;
import io.micronaut.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByUsername(String username);

    boolean existsByUsername(String username);

    /** Lista de usuarios con sus bancos asignados cargados (panel de administración). */
    @Query("SELECT DISTINCT u FROM AppUser u LEFT JOIN FETCH u.allowedExamTypes ORDER BY u.id")
    List<AppUser> findAllWithBanks();

    @EntityGraph(attributePaths = {"allowedExamTypes"})
    @Override
    List<AppUser> findAll();

    @EntityGraph(attributePaths = {"allowedExamTypes"})
    @Override
    Optional<AppUser> findById(Long id);
}
