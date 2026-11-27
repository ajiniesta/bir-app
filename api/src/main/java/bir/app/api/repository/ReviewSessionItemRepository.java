package bir.app.api.repository;

import bir.app.api.entity.ReviewSessionItem;
import io.micronaut.data.annotation.Query;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ReviewSessionItemRepository extends JpaRepository<ReviewSessionItem, Long> {

    @Query("SELECT i FROM ReviewSessionItem i " +
           "JOIN FETCH i.question q JOIN FETCH q.examType " +
           "JOIN FETCH i.session s JOIN FETCH s.user " +
           "WHERE s.user.username = :username AND i.answeredAt IS NOT NULL")
    List<ReviewSessionItem> findAnsweredByUsername(String username);

    @Query("SELECT i FROM ReviewSessionItem i " +
           "JOIN FETCH i.question q JOIN FETCH q.examType " +
           "JOIN FETCH i.session s JOIN FETCH s.user " +
           "WHERE i.answeredAt IS NOT NULL")
    List<ReviewSessionItem> findAllAnswered();

    @Query("SELECT i FROM ReviewSessionItem i " +
           "JOIN FETCH i.session s JOIN FETCH s.user " +
           "WHERE i.question.id = :questionId AND i.answeredAt IS NOT NULL")
    List<ReviewSessionItem> findAnsweredByQuestionId(Long questionId);

    @Query("SELECT DISTINCT i.question.id FROM ReviewSessionItem i WHERE i.question.id IN (:questionIds)")
    List<Long> findQuestionIdsIn(Collection<Long> questionIds);

    @Query("UPDATE ReviewSessionItem i SET i.question.id = :keepId WHERE i.question.id = :duplicateId")
    int rePointQuestion(Long duplicateId, Long keepId);
}
