package bir.app.api.repository;

import bir.app.api.entity.Question;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.annotation.EntityGraph;
import io.micronaut.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {

    @EntityGraph(attributePaths = {"examType", "answerOptions"})
    @Override
    List<Question> findAll();

    @EntityGraph(attributePaths = {"examType", "answerOptions"})
    @Override
    Optional<Question> findById(Long id);

    @EntityGraph(attributePaths = {"examType", "answerOptions"})
    List<Question> findByExamTypeCode(String examTypeCode);

    List<Question> findByCategoryIgnoreCase(String category);
}
