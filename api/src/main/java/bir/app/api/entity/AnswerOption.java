package bir.app.api.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "answer_option", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"question_id", "letter"})
})
public class AnswerOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(nullable = false, length = 1)
    private String letter;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(name = "is_correct", nullable = false)
    private Boolean isCorrect;

    public AnswerOption() {}

    public AnswerOption(String letter, String text, Boolean isCorrect) {
        this.letter = letter;
        this.text = text;
        this.isCorrect = isCorrect;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Question getQuestion() { return question; }
    public void setQuestion(Question question) { this.question = question; }

    public String getLetter() { return letter; }
    public void setLetter(String letter) { this.letter = letter; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public Boolean getIsCorrect() { return isCorrect; }
    public void setIsCorrect(Boolean isCorrect) { this.isCorrect = isCorrect; }
}
