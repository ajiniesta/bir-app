package bir.app.api.repository;

import bir.app.api.entity.MockExamQuestion;
import io.micronaut.data.annotation.Query;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

@Repository
public interface MockExamQuestionRepository extends JpaRepository<MockExamQuestion, Long> {

    /** Enlaces de una pregunta con los simulacros que la contienen. */
    @Query("SELECT mq FROM MockExamQuestion mq JOIN FETCH mq.mockExam WHERE mq.question.id = :questionId")
    List<MockExamQuestion> findByQuestionId(Long questionId);

    /** Ids de las preguntas (de las indicadas) que están en algún simulacro. */
    @Query("SELECT DISTINCT mq.question.id FROM MockExamQuestion mq WHERE mq.question.id IN (:questionIds)")
    List<Long> findQuestionIdsIn(Collection<Long> questionIds);

    /** Re-apunta al conservado todas las apariciones de la duplicada. */
    @Query("UPDATE MockExamQuestion mq SET mq.question.id = :keepId WHERE mq.question.id = :duplicateId")
    int rePointQuestion(Long duplicateId, Long keepId);

    /**
     * Cierra el hueco que deja una pregunta eliminada de un simulacro. Las
     * posiciones deben quedar contiguas: el navegador del intento avanza con
     * {@code position ± 1}.
     */
    @Query("UPDATE MockExamQuestion mq SET mq.position = mq.position - 1 " +
           "WHERE mq.mockExam.id = :mockExamId AND mq.position > :position")
    int shiftPositionsAfter(Long mockExamId, Integer position);
}
