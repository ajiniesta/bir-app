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

    /**
     * Enunciados de un banco, para detectar duplicados al importar. Se compara
     * en memoria con el texto normalizado, así que basta con traer los textos.
     */
    @Query("SELECT q.text FROM Question q WHERE q.examType.id = :examTypeId AND q.text IS NOT NULL")
    List<String> findTextsByExamTypeId(Long examTypeId);

    /**
     * Todas las preguntas con sus opciones y su banco. La usa la limpieza de
     * duplicados, que compara enunciados y opciones en memoria.
     */
    @Query("SELECT DISTINCT q FROM Question q JOIN FETCH q.examType e " +
           "LEFT JOIN FETCH q.answerOptions " +
           "WHERE (:examType = '' OR e.code = :examType) ORDER BY q.id")
    List<Question> findAllWithOptions(String examType);

    @Query("SELECT DISTINCT q.category FROM Question q WHERE q.category IS NOT NULL AND q.category <> '' ORDER BY q.category")
    List<String> findDistinctCategories();

    /** Categorías existentes en un conjunto de bancos (las visibles para un USER). */
    @Query("SELECT DISTINCT q.category FROM Question q " +
           "WHERE q.category IS NOT NULL AND q.category <> '' AND q.examType.code IN (:examTypeCodes) " +
           "ORDER BY q.category")
    List<String> findDistinctCategoriesByExamTypeCodeIn(java.util.Collection<String> examTypeCodes);

    @Query("SELECT DISTINCT q.tag FROM Question q WHERE q.tag IS NOT NULL AND q.tag <> '' ORDER BY q.tag")
    List<String> findDistinctTags();

    /**
     * Búsqueda paginada por banco, categoría, tag y texto del enunciado. Los
     * filtros vacíos ({@code ""}) no filtran; {@code __NONE__} como categoría o
     * tag busca las preguntas sin categoría/tag. El texto se compara sin
     * mayúsculas ni acentos.
     */
    @Query(value = """
            SELECT q FROM Question q JOIN FETCH q.examType e
            WHERE (:examType = '' OR e.code = :examType)
              AND (:category = ''
                   OR (:category = '__NONE__' AND (q.category IS NULL OR q.category = ''))
                   OR q.category = :category)
              AND (:tag = ''
                   OR (:tag = '__NONE__' AND (q.tag IS NULL OR q.tag = ''))
                   OR q.tag = :tag)
              AND LOWER(FUNCTION('translate', q.text, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) LIKE :text
            ORDER BY q.id DESC
            """,
            countQuery = """
            SELECT COUNT(q) FROM Question q JOIN q.examType e
            WHERE (:examType = '' OR e.code = :examType)
              AND (:category = ''
                   OR (:category = '__NONE__' AND (q.category IS NULL OR q.category = ''))
                   OR q.category = :category)
              AND (:tag = ''
                   OR (:tag = '__NONE__' AND (q.tag IS NULL OR q.tag = ''))
                   OR q.tag = :tag)
              AND LOWER(FUNCTION('translate', q.text, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) LIKE :text
            """)
    Page<Question> search(String examType, String category, String tag, String text, Pageable pageable);
}
