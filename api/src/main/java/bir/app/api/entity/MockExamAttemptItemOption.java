package bir.app.api.entity;

import jakarta.persistence.*;

/**
 * Opción de respuesta tal y como estaba al iniciar un intento de simulacro.
 */
@Entity
@Table(name = "mock_exam_attempt_item_option", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"item_id", "letter"})
})
public class MockExamAttemptItemOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private MockExamAttemptItem item;

    @Column(nullable = false, length = 1)
    private String letter;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(name = "is_correct", nullable = false)
    private Boolean isCorrect;

    public MockExamAttemptItemOption() {}

    public MockExamAttemptItemOption(String letter, String text, Boolean isCorrect) {
        this.letter = letter;
        this.text = text;
        this.isCorrect = isCorrect;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public MockExamAttemptItem getItem() { return item; }
    public void setItem(MockExamAttemptItem item) { this.item = item; }

    public String getLetter() { return letter; }
    public void setLetter(String letter) { this.letter = letter; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public Boolean getIsCorrect() { return isCorrect; }
    public void setIsCorrect(Boolean isCorrect) { this.isCorrect = isCorrect; }
}
