package bir.app.api.support;

import bir.app.api.entity.AnswerOption;
import bir.app.api.entity.AppUser;
import bir.app.api.entity.ExamType;
import bir.app.api.entity.FreeSession;
import bir.app.api.entity.MockExam;
import bir.app.api.entity.MockExamQuestion;
import bir.app.api.entity.Question;
import bir.app.api.entity.SessionItem;
import bir.app.api.entity.UserRole;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Factorías de entidades para los tests unitarios. Las entidades JPA tienen
 * constructor vacío y setters, así que se pueden montar sin base de datos.
 */
public final class TestData {

    private TestData() {
    }

    public static ExamType examType(Long id, String code, String name) {
        ExamType examType = new ExamType(code, name);
        examType.setId(id);
        return examType;
    }

    public static AppUser user(Long id, String username, UserRole role) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setUsername(username);
        user.setDisplayName(username);
        user.setPasswordHash("hash");
        user.setRole(role);
        return user;
    }

    public static AnswerOption option(String letter, String text, boolean correct) {
        return new AnswerOption(letter, text, correct);
    }

    public static Question question(Long id, String text, ExamType examType, AnswerOption... options) {
        Question question = new Question();
        question.setId(id);
        question.setText(text);
        question.setExamType(examType);
        List<AnswerOption> list = new ArrayList<>(Arrays.asList(options));
        list.forEach(option -> option.setQuestion(question));
        question.setAnswerOptions(list);
        return question;
    }

    public static MockExam mockExam(Long id, String title, ExamType examType, Question... questions) {
        MockExam exam = new MockExam();
        exam.setId(id);
        exam.setTitle(title);
        exam.setExamType(examType);
        List<MockExamQuestion> items = new ArrayList<>();
        for (int i = 0; i < questions.length; i++) {
            MockExamQuestion item = new MockExamQuestion();
            item.setMockExam(exam);
            item.setQuestion(questions[i]);
            item.setPosition(i + 1);
            items.add(item);
        }
        exam.setQuestions(items);
        return exam;
    }

    public static FreeSession freeSession(Long id, AppUser user, ExamType examType,
                                          String category, String tag, Question... questions) {
        FreeSession session = new FreeSession();
        session.setId(id);
        session.setUser(user);
        session.setExamType(examType);
        session.setCategory(category);
        session.setTag(tag);
        session.setRequestedCount(questions.length);
        List<SessionItem> items = new ArrayList<>();
        for (int i = 0; i < questions.length; i++) {
            SessionItem item = new SessionItem();
            item.setSession(session);
            item.setQuestion(questions[i]);
            item.setPosition(i + 1);
            items.add(item);
        }
        session.setItems(items);
        return session;
    }
}
