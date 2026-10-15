package bir.app.api.service;

import bir.app.api.dto.ExamTypeResponse;
import bir.app.api.repository.ExamTypeRepository;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

import java.util.List;

@Singleton
public class ExamTypeService {

    private final ExamTypeRepository examTypeRepository;

    public ExamTypeService(ExamTypeRepository examTypeRepository) {
        this.examTypeRepository = examTypeRepository;
    }

    @Transactional
    public List<ExamTypeResponse> findAll() {
        return examTypeRepository.findAllOrderedByCode()
                .stream().map(ExamTypeResponse::from)
                .toList();
    }
}
