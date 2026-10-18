package bir.app.api.repository;

import bir.app.api.entity.AppUser;
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
    @EntityGraph(attributePaths = {"allowedExamTypes"})
    @Override
    List<AppUser> findAll();

    @EntityGraph(attributePaths = {"allowedExamTypes"})
    @Override
    Optional<AppUser> findById(Long id);
}
