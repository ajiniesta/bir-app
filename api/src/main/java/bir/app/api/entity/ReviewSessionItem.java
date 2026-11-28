package bir.app.api.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Una pregunta servida dentro de una sesión de modo repaso.
 */
@Entity
@Table(name = "review_session_item", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"session_id", "position"})
})
public class ReviewSessionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private ReviewSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(nullable = false)
    private Integer position;

    @Column(name = "selected_letter", length = 1)
    private String selectedLetter;

    @Column(name = "is_correct")
    private Boolean isCorrect;

    @Column(name = "answered_at")
    private LocalDateTime answeredAt;

    public boolean isAnswered() {
        return answeredAt != null;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public ReviewSession getSession() { return session; }
    public void setSession(ReviewSession session) { this.session = session; }

    public Question getQuestion() { return question; }
    public void setQuestion(Question question) { this.question = question; }

    public Integer getPosition() { return position; }
    public void setPosition(Integer position) { this.position = position; }

    public String getSelectedLetter() { return selectedLetter; }
    public void setSelectedLetter(String selectedLetter) { this.selectedLetter = selectedLetter; }

    public Boolean getIsCorrect() { return isCorrect; }
    public void setIsCorrect(Boolean isCorrect) { this.isCorrect = isCorrect; }

    public LocalDateTime getAnsweredAt() { return answeredAt; }
    public void setAnsweredAt(LocalDateTime answeredAt) { this.answeredAt = answeredAt; }
}
