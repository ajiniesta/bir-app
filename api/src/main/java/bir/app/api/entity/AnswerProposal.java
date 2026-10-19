package bir.app.api.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Propuesta de respuesta alternativa para una pregunta. Un usuario la crea
 * cuando cree que la opción marcada como correcta es errónea o conflictiva,
 * indicando otra opción existente y/o un texto alternativo, con un motivo.
 * <p>
 * ADMIN/CREATOR la revisan ({@code status} + {@code reviewerNote}) y, de forma
 * independiente, pueden aplicarla a la pregunta ({@code appliedAt}). Hay como
 * mucho una propuesta por usuario y pregunta: si vuelve a enviarla mientras no
 * esté aceptada, se actualiza la misma fila y se reinicia a {@code PENDING}.
 */
@Entity
@Table(name = "answer_proposal", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"question_id", "proposed_by"})
})
public class AnswerProposal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proposed_by", nullable = false)
    private AppUser proposedBy;

    @Column(name = "proposed_letter", length = 1)
    private String proposedLetter;

    @Column(name = "proposed_text", columnDefinition = "TEXT")
    private String proposedText;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String comment;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 30)
    private ProposalSource source;

    @Column(name = "source_id")
    private Long sourceId;

    @Column(name = "position")
    private Integer position;

    @Column(name = "selected_letter", length = 1)
    private String selectedLetter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProposalStatus status = ProposalStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private AppUser reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "reviewer_note", columnDefinition = "TEXT")
    private String reviewerNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applied_by")
    private AppUser appliedBy;

    @Column(name = "applied_at")
    private LocalDateTime appliedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Question getQuestion() { return question; }
    public void setQuestion(Question question) { this.question = question; }

    public AppUser getProposedBy() { return proposedBy; }
    public void setProposedBy(AppUser proposedBy) { this.proposedBy = proposedBy; }

    public String getProposedLetter() { return proposedLetter; }
    public void setProposedLetter(String proposedLetter) { this.proposedLetter = proposedLetter; }

    public String getProposedText() { return proposedText; }
    public void setProposedText(String proposedText) { this.proposedText = proposedText; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public ProposalSource getSource() { return source; }
    public void setSource(ProposalSource source) { this.source = source; }

    public Long getSourceId() { return sourceId; }
    public void setSourceId(Long sourceId) { this.sourceId = sourceId; }

    public Integer getPosition() { return position; }
    public void setPosition(Integer position) { this.position = position; }

    public String getSelectedLetter() { return selectedLetter; }
    public void setSelectedLetter(String selectedLetter) { this.selectedLetter = selectedLetter; }

    public ProposalStatus getStatus() { return status; }
    public void setStatus(ProposalStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public AppUser getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(AppUser reviewedBy) { this.reviewedBy = reviewedBy; }

    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }

    public String getReviewerNote() { return reviewerNote; }
    public void setReviewerNote(String reviewerNote) { this.reviewerNote = reviewerNote; }

    public AppUser getAppliedBy() { return appliedBy; }
    public void setAppliedBy(AppUser appliedBy) { this.appliedBy = appliedBy; }

    public LocalDateTime getAppliedAt() { return appliedAt; }
    public void setAppliedAt(LocalDateTime appliedAt) { this.appliedAt = appliedAt; }
}
