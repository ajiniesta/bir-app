package bir.app.api;

import bir.app.api.entity.AnswerOption;
import bir.app.api.entity.AnswerProposal;
import bir.app.api.entity.AppUser;
import bir.app.api.entity.ExamType;
import bir.app.api.entity.FreeSession;
import bir.app.api.entity.MockExam;
import bir.app.api.entity.MockExamAttempt;
import bir.app.api.entity.MockExamAttemptItem;
import bir.app.api.entity.MockExamAttemptItemOption;
import bir.app.api.entity.MockExamQuestion;
import bir.app.api.entity.ProposalSource;
import bir.app.api.entity.ProposalStatus;
import bir.app.api.entity.Question;
import bir.app.api.entity.SessionItem;
import bir.app.api.entity.UserRole;
import io.micronaut.core.annotation.TypeHint;
import io.micronaut.core.annotation.TypeHint.AccessType;
import io.micronaut.runtime.Micronaut;
import org.hibernate.dialect.PostgreSQLDialect;

@TypeHint(
        value = {
                PostgreSQLDialect.class,
                AnswerOption.class,
                AnswerProposal.class,
                AppUser.class,
                ExamType.class,
                FreeSession.class,
                MockExam.class,
                MockExamAttempt.class,
                MockExamAttemptItem.class,
                MockExamAttemptItemOption.class,
                MockExamQuestion.class,
                ProposalSource.class,
                ProposalStatus.class,
                Question.class,
                SessionItem.class,
                UserRole.class
        },
        accessType = {
                AccessType.ALL_PUBLIC,
                AccessType.ALL_DECLARED_CONSTRUCTORS,
                AccessType.ALL_DECLARED_FIELDS,
                AccessType.ALL_DECLARED_METHODS
        }
)
public class BirAppApi {
    public static void main(String[] args) {
        Micronaut.run(BirAppApi.class, args);
    }
}
