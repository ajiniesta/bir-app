package bir.app.api.repository;

import bir.app.api.entity.QuestionLearningStatus;
import bir.app.api.entity.UserQuestionStatus;
import io.micronaut.data.annotation.Query;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.repository.JpaRepository;
import io.micronaut.data.model.Page;
import io.micronaut.data.model.Pageable;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserQuestionStatusRepository extends JpaRepository<UserQuestionStatus, Long> {

    Optional<UserQuestionStatus> findByUserIdAndQuestionId(Long userId, Long questionId);

    @Query("SELECT uqs FROM UserQuestionStatus uqs WHERE uqs.user.username = :username AND uqs.question.id = :questionId")
    Optional<UserQuestionStatus> findByUserUsernameAndQuestionId(String username, Long questionId);

    @Query("SELECT uqs.question.id FROM UserQuestionStatus uqs WHERE uqs.user.username = :username AND uqs.status = :status")
    List<Long> findQuestionIdsByUsernameAndStatus(String username, QuestionLearningStatus status);

    @Query("SELECT uqs.question.id FROM UserQuestionStatus uqs WHERE uqs.user.username = :username AND uqs.status IN (:statuses)")
    List<Long> findQuestionIdsByUsernameAndStatusIn(String username, Collection<QuestionLearningStatus> statuses);

    @Query("SELECT uqs FROM UserQuestionStatus uqs JOIN FETCH uqs.user JOIN FETCH uqs.question WHERE uqs.question.id IN (:questionIds)")
    List<UserQuestionStatus> findByQuestionIdIn(Collection<Long> questionIds);

    @Query(value = """
            SELECT uqs FROM UserQuestionStatus uqs
            JOIN FETCH uqs.question q
            JOIN FETCH q.examType e
            WHERE uqs.user.username = :username
              AND uqs.status IN (:statuses)
              AND (:examType = '' OR e.code = :examType)
              AND (:category = ''
                   OR (:category = '__NONE__' AND (q.category IS NULL OR q.category = ''))
                   OR q.category = :category)
              AND (:tag = ''
                   OR (:tag = '__NONE__' AND (q.tag IS NULL OR q.tag = ''))
                   OR q.tag = :tag
                   OR LOWER(CONCAT(', ', q.tag, ', ')) LIKE LOWER(CONCAT('%, ', :tag, ', %')))
              AND LOWER(FUNCTION('translate', q.text, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) LIKE :text
            ORDER BY uqs.updatedAt DESC, q.id DESC
            """,
            countQuery = """
            SELECT COUNT(uqs) FROM UserQuestionStatus uqs
            JOIN uqs.question q
            JOIN q.examType e
            WHERE uqs.user.username = :username
              AND uqs.status IN (:statuses)
              AND (:examType = '' OR e.code = :examType)
              AND (:category = ''
                   OR (:category = '__NONE__' AND (q.category IS NULL OR q.category = ''))
                   OR q.category = :category)
              AND (:tag = ''
                   OR (:tag = '__NONE__' AND (q.tag IS NULL OR q.tag = ''))
                   OR q.tag = :tag
                   OR LOWER(CONCAT(', ', q.tag, ', ')) LIKE LOWER(CONCAT('%, ', :tag, ', %')))
              AND LOWER(FUNCTION('translate', q.text, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) LIKE :text
            """)
    Page<UserQuestionStatus> searchAllByUsernameAndStatuses(
            String username,
            Collection<QuestionLearningStatus> statuses,
            String examType,
            String category,
            String tag,
            String text,
            Pageable pageable);

    @Query(value = """
            SELECT uqs FROM UserQuestionStatus uqs
            JOIN FETCH uqs.question q
            JOIN FETCH q.examType e
            WHERE uqs.user.username = :username
              AND uqs.status IN (:statuses)
              AND e.code IN (:allowedBanks)
              AND (:examType = '' OR e.code = :examType)
              AND (:category = ''
                   OR (:category = '__NONE__' AND (q.category IS NULL OR q.category = ''))
                   OR q.category = :category)
              AND (:tag = ''
                   OR (:tag = '__NONE__' AND (q.tag IS NULL OR q.tag = ''))
                   OR q.tag = :tag
                   OR LOWER(CONCAT(', ', q.tag, ', ')) LIKE LOWER(CONCAT('%, ', :tag, ', %')))
              AND LOWER(FUNCTION('translate', q.text, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) LIKE :text
            ORDER BY uqs.updatedAt DESC, q.id DESC
            """,
            countQuery = """
            SELECT COUNT(uqs) FROM UserQuestionStatus uqs
            JOIN uqs.question q
            JOIN q.examType e
            WHERE uqs.user.username = :username
              AND uqs.status IN (:statuses)
              AND e.code IN (:allowedBanks)
              AND (:examType = '' OR e.code = :examType)
              AND (:category = ''
                   OR (:category = '__NONE__' AND (q.category IS NULL OR q.category = ''))
                   OR q.category = :category)
              AND (:tag = ''
                   OR (:tag = '__NONE__' AND (q.tag IS NULL OR q.tag = ''))
                   OR q.tag = :tag
                   OR LOWER(CONCAT(', ', q.tag, ', ')) LIKE LOWER(CONCAT('%, ', :tag, ', %')))
              AND LOWER(FUNCTION('translate', q.text, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) LIKE :text
            """)
    Page<UserQuestionStatus> searchByUsernameAndStatuses(
            String username,
            Collection<QuestionLearningStatus> statuses,
            Collection<String> allowedBanks,
            String examType,
            String category,
            String tag,
            String text,
            Pageable pageable);
}
