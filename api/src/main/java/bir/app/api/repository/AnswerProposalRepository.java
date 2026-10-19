package bir.app.api.repository;

import bir.app.api.entity.AnswerProposal;
import bir.app.api.entity.ProposalStatus;
import io.micronaut.data.annotation.Query;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface AnswerProposalRepository extends JpaRepository<AnswerProposal, Long> {

    /** Propuesta (única) de un usuario para una pregunta. */
    Optional<AnswerProposal> findByQuestionIdAndProposedByUsername(Long questionId, String username);

    /** Propuestas del usuario para un conjunto de preguntas (para pintar el estado). */
    List<AnswerProposal> findByQuestionIdInAndProposedByUsername(Collection<Long> questionIds, String username);

    @Query("SELECT p FROM AnswerProposal p WHERE p.status = :status ORDER BY p.createdAt ASC")
    List<AnswerProposal> findOrderedByStatus(ProposalStatus status);

    @Query("SELECT p FROM AnswerProposal p ORDER BY p.createdAt ASC")
    List<AnswerProposal> findOrdered();

    long countByStatus(ProposalStatus status);
}
