package bir.app.api.service;

import bir.app.api.dto.CreateQuestionRequest;
import bir.app.api.dto.DashboardStatsResponse;
import bir.app.api.dto.QuestionResponse;
import bir.app.api.entity.AnswerOption;
import bir.app.api.entity.ExamType;
import bir.app.api.entity.Question;
import bir.app.api.repository.ExamTypeRepository;
import bir.app.api.repository.MockExamRepository;
import bir.app.api.repository.QuestionRepository;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;

@Singleton
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final ExamTypeRepository examTypeRepository;
    private final MockExamRepository mockExamRepository;
    private final AccessControlService accessControlService;

    public QuestionService(QuestionRepository questionRepository,
                           ExamTypeRepository examTypeRepository,
                           MockExamRepository mockExamRepository,
                           AccessControlService accessControlService) {
        this.questionRepository = questionRepository;
        this.examTypeRepository = examTypeRepository;
        this.mockExamRepository = mockExamRepository;
        this.accessControlService = accessControlService;
    }

    @Transactional
    public List<QuestionResponse> findAll() {
        return questionRepository.findAll()
                .stream().map(QuestionResponse::from)
                .toList();
    }

    @Transactional
    public QuestionResponse findById(Long id) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Question not found: " + id));
        return QuestionResponse.from(question);
    }

    @Transactional
    public QuestionResponse create(CreateQuestionRequest request) {
        ExamType examType = examTypeRepository.findById(request.examTypeId())
                .orElseThrow(() -> new NoSuchElementException("Exam type not found: " + request.examTypeId()));

        long correctCount = request.answerOptions().stream()
                .filter(CreateQuestionRequest.AnswerOptionRequest::isCorrect)
                .count();
        if (correctCount != 1) {
            throw new IllegalArgumentException("Exactly one answer must be correct, but found " + correctCount);
        }

        Question question = new Question();
        question.setText(request.text());
        question.setCategory(request.category());
        question.setExamType(examType);

        List<AnswerOption> options = request.answerOptions().stream().map(opt -> {
            AnswerOption option = new AnswerOption(opt.letter(), opt.text(), opt.isCorrect());
            option.setQuestion(question);
            return option;
        }).toList();

        question.setAnswerOptions(new ArrayList<>(options));
        return QuestionResponse.from(questionRepository.save(question));
    }

    @Transactional
    public QuestionResponse update(Long id, CreateQuestionRequest request) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Question not found: " + id));

        ExamType examType = examTypeRepository.findById(request.examTypeId())
                .orElseThrow(() -> new NoSuchElementException("Exam type not found: " + request.examTypeId()));

        long correctCount = request.answerOptions().stream()
                .filter(CreateQuestionRequest.AnswerOptionRequest::isCorrect)
                .count();
        if (correctCount != 1) {
            throw new IllegalArgumentException("Exactly one answer must be correct, but found " + correctCount);
        }

        question.setText(request.text());
        question.setCategory(request.category());
        question.setExamType(examType);

        question.getAnswerOptions().clear();
        // Fuerza los DELETE del orphan removal antes de reinsertar opciones con las
        // mismas letras; sin este flush Hibernate ejecutaría los INSERT primero y
        // violaría la restricción UNIQUE(question_id, letter).
        questionRepository.flush();
        List<AnswerOption> options = request.answerOptions().stream().map(opt -> {
            AnswerOption option = new AnswerOption(opt.letter(), opt.text(), opt.isCorrect());
            option.setQuestion(question);
            return option;
        }).toList();
        question.getAnswerOptions().addAll(options);

        return QuestionResponse.from(questionRepository.save(question));
    }

    @Transactional
    public void delete(Long id) {
        if (!questionRepository.existsById(id)) {
            throw new NoSuchElementException("Question not found: " + id);
        }
        if (mockExamRepository.countByQuestionId(id) > 0) {
            throw new IllegalArgumentException(
                    "La pregunta forma parte de un simulacro; quítala del simulacro antes de eliminarla");
        }
        questionRepository.deleteById(id);
    }

    @Transactional
    public List<QuestionResponse> findByExamType(String examTypeCode) {
        return questionRepository.findByExamTypeCode(examTypeCode)
                .stream().map(QuestionResponse::from)
                .toList();
    }

    @Transactional
    public List<String> listCategories() {
        return questionRepository.findDistinctCategories();
    }

    @Transactional
    public DashboardStatsResponse dashboardStats() {
        List<DashboardStatsResponse.ExamTypeStats> byExamType = examTypeRepository.countQuestionsByExamType();
        long total = byExamType.stream()
                .mapToLong(DashboardStatsResponse.ExamTypeStats::total)
                .sum();
        return new DashboardStatsResponse(total, byExamType);
    }

    /**
     * Contadores del banco de preguntas visibles para el usuario: todos para
     * ADMIN/CREATOR; solo los bancos asignados para el rol USER.
     */
    @Transactional
    public DashboardStatsResponse dashboardStatsFor(String username) {
        if (accessControlService.hasGlobalBankAccess(username)) {
            return dashboardStats();
        }
        Set<String> allowed = accessControlService.allowedBankCodes(username);
        List<DashboardStatsResponse.ExamTypeStats> byExamType = examTypeRepository.countQuestionsByExamType().stream()
                .filter(stats -> allowed.contains(stats.code()))
                .toList();
        long total = byExamType.stream()
                .mapToLong(DashboardStatsResponse.ExamTypeStats::total)
                .sum();
        return new DashboardStatsResponse(total, byExamType);
    }
}
