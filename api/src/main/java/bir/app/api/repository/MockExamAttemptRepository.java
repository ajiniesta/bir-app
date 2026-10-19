package bir.app.api.repository;

import bir.app.api.entity.MockExamAttempt;
import io.micronaut.data.annotation.Query;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MockExamAttemptRepository extends JpaRepository<MockExamAttempt, Long> {

    @Query("SELECT a FROM MockExamAttempt a WHERE a.mockExam.id = :mockExamId " +
           "AND a.user.username = :username ORDER BY a.startedAt DESC")
    List<MockExamAttempt> findByMockExamAndUser(Long mockExamId, String username);

    @Query("SELECT a FROM MockExamAttempt a WHERE a.id = :id AND a.user.username = :username")
    Optional<MockExamAttempt> findByIdAndUsername(Long id, String username);

    @Query("SELECT a FROM MockExamAttempt a " +
           "JOIN FETCH a.mockExam m JOIN FETCH m.examType " +
           "WHERE a.user.username = :username ORDER BY a.startedAt DESC")
    List<MockExamAttempt> findByUsername(String username);

    @Query("SELECT COUNT(a) FROM MockExamAttempt a WHERE a.mockExam.id = :mockExamId")
    long countByMockExam(Long mockExamId);
}
