package bir.app.api.repository;

import bir.app.api.entity.Question;
import io.micronaut.data.annotation.Query;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.annotation.EntityGraph;
import io.micronaut.data.jpa.repository.JpaRepository;
import io.micronaut.data.model.Page;
import io.micronaut.data.model.Pageable;

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

    @EntityGraph(attributePaths = {"examType", "answerOptions"})
    List<Question> findByExamTypeCodeIn(java.util.Collection<String> examTypeCodes);

    List<Question> findByCategoryIgnoreCase(String category);

    @EntityGraph(attributePaths = {"examType", "answerOptions"})
    List<Question> findByIdIn(java.util.Collection<Long> ids);

    @Query("SELECT DISTINCT q.category FROM Question q WHERE q.category IS NOT NULL AND q.category <> '' ORDER BY q.category")
    List<String> findDistinctCategories();

    /**
     * Búsqueda paginada por banco, categoría y texto del enunciado. Los filtros
     * vacíos ({@code ""}) no filtran; {@code __NONE__} como categoría busca las
     * preguntas sin categoría. El texto se compara sin mayúsculas ni acentos.
     */
    @Query(value = """
            SELECT q FROM Question q JOIN FETCH q.examType e
            WHERE (:examType = '' OR e.code = :examType)
              AND (:category = ''
                   OR (:category = '__NONE__' AND (q.category IS NULL OR q.category = ''))
                   OR q.category = :category)
              AND LOWER(FUNCTION('translate', q.text, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) LIKE :text
            ORDER BY q.id DESC
            """,
            countQuery = """
            SELECT COUNT(q) FROM Question q JOIN q.examType e
            WHERE (:examType = '' OR e.code = :examType)
              AND (:category = ''
                   OR (:category = '__NONE__' AND (q.category IS NULL OR q.category = ''))
                   OR q.category = :category)
              AND LOWER(FUNCTION('translate', q.text, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) LIKE :text
            """)
    Page<Question> search(String examType, String category, String text, Pageable pageable);
}
