package bir.app.api.repository;

import bir.app.api.entity.Question;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.repository.JpaRepository;

import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByExamTypeCode(String examTypeCode);
    List<Question> findByCategoryIgnoreCase(String category);
}
