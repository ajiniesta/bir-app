package bir.app.api.repository;

import bir.app.api.dto.DashboardStatsResponse;
import bir.app.api.entity.ExamType;
import io.micronaut.data.annotation.Query;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExamTypeRepository extends JpaRepository<ExamType, Long> {

    Optional<ExamType> findByCode(String code);

    List<ExamType> findByCodeIn(Collection<String> codes);

    @Query("SELECT e FROM ExamType e ORDER BY e.code")
    List<ExamType> findAllOrderedByCode();

    /**
     * Número de preguntas de cada tipo de examen. Se parte de exam_type con LEFT JOIN
     * para que los tipos sin preguntas aparezcan con total 0.
     */
    @Query("SELECT e.code AS code, e.name AS name, COUNT(q) AS total " +
           "FROM ExamType e LEFT JOIN Question q ON q.examType = e " +
           "GROUP BY e.code, e.name ORDER BY e.code")
    List<DashboardStatsResponse.ExamTypeStats> countQuestionsByExamType();
}
