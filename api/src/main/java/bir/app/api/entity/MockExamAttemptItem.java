package bir.app.api.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Snapshot de una pregunta dentro de un intento. El texto, la categoría y la
 * letra correcta se congelan al iniciar el intento para que las estadísticas no
 * cambien si la pregunta se edita o se borra después.
 */
@Entity
@Table(name = "mock_exam_attempt_item", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"attempt_id", "position"})
})
public class MockExamAttemptItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false)
    private MockExamAttempt attempt;

    /** Referencia informativa; queda a NULL si la pregunta original se borra. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    private Question question;

    @Column(nullable = false)
    private Integer position;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(length = 100)
    private String category;

    @Column(length = 100)
    private String tag;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    @Column(name = "selected_letter", length = 1)
    private String selectedLetter;

    @Column(name = "correct_letter", nullable = false, length = 1)
    private String correctLetter;

    @Column(name = "is_correct")
    private Boolean isCorrect;

    @Column(name = "answered_at")
    private LocalDateTime answeredAt;

    @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("letter ASC")
    private List<MockExamAttemptItemOption> options = new ArrayList<>();

    public boolean isAnswered() {
        return answeredAt != null;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public MockExamAttempt getAttempt() { return attempt; }
    public void setAttempt(MockExamAttempt attempt) { this.attempt = attempt; }

    public Question getQuestion() { return question; }
    public void setQuestion(Question question) { this.question = question; }

    public Integer getPosition() { return position; }
    public void setPosition(Integer position) { this.position = position; }

    public String getQuestionText() { return questionText; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getTag() { return tag; }
    public void setTag(String tag) { this.tag = tag; }

    public String getExplanation() { return explanation; }
    public void setExplanation(String explanation) { this.explanation = explanation; }

    public String getSelectedLetter() { return selectedLetter; }
    public void setSelectedLetter(String selectedLetter) { this.selectedLetter = selectedLetter; }

    public String getCorrectLetter() { return correctLetter; }
    public void setCorrectLetter(String correctLetter) { this.correctLetter = correctLetter; }

    public Boolean getIsCorrect() { return isCorrect; }
    public void setIsCorrect(Boolean isCorrect) { this.isCorrect = isCorrect; }

    public LocalDateTime getAnsweredAt() { return answeredAt; }
    public void setAnsweredAt(LocalDateTime answeredAt) { this.answeredAt = answeredAt; }

    public List<MockExamAttemptItemOption> getOptions() { return options; }
    public void setOptions(List<MockExamAttemptItemOption> options) { this.options = options; }
}
