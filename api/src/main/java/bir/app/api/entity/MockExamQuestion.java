package bir.app.api.entity;

import jakarta.persistence.*;

/**
 * Pregunta que forma parte de un simulacro, con su posición dentro del mismo.
 */
@Entity
@Table(name = "mock_exam_question", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"mock_exam_id", "position"}),
    @UniqueConstraint(columnNames = {"mock_exam_id", "question_id"})
})
public class MockExamQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mock_exam_id", nullable = false)
    private MockExam mockExam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(nullable = false)
    private Integer position;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public MockExam getMockExam() { return mockExam; }
    public void setMockExam(MockExam mockExam) { this.mockExam = mockExam; }

    public Question getQuestion() { return question; }
    public void setQuestion(Question question) { this.question = question; }

    public Integer getPosition() { return position; }
    public void setPosition(Integer position) { this.position = position; }
}
