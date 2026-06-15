package bir.app.api.repository;

import bir.app.api.entity.ExamType;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.repository.JpaRepository;

import java.util.Optional;

@Repository
public interface ExamTypeRepository extends JpaRepository<ExamType, Long> {
    Optional<ExamType> findByCode(String code);
}
