package bir.app.api.repository;

import bir.app.api.entity.MockExam;
import io.micronaut.data.annotation.Query;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface MockExamRepository extends JpaRepository<MockExam, Long> {

    @Query("SELECT DISTINCT m FROM MockExam m " +
           "JOIN FETCH m.examType " +
           "LEFT JOIN FETCH m.questions " +
           "ORDER BY m.title")
    List<MockExam> findAllWithQuestions();

    @Query("SELECT DISTINCT m FROM MockExam m " +
           "JOIN FETCH m.examType " +
           "LEFT JOIN FETCH m.questions " +
           "WHERE m.examType.code IN (:codes) ORDER BY m.title")
    List<MockExam> findByExamTypeCodeInWithQuestions(Collection<String> codes);

    @Query("SELECT m FROM MockExam m " +
           "JOIN FETCH m.examType " +
           "LEFT JOIN FETCH m.questions mq " +
           "LEFT JOIN FETCH mq.question " +
           "WHERE m.id = :id")
    Optional<MockExam> findDetailedById(Long id);

    @Query("SELECT COUNT(q) FROM MockExamQuestion q WHERE q.question.id = :questionId")
    long countByQuestionId(Long questionId);
}
