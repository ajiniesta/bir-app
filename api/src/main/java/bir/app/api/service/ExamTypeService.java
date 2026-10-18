package bir.app.api.service;

import bir.app.api.dto.ExamTypeResponse;
import bir.app.api.repository.ExamTypeRepository;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Set;

@Singleton
public class ExamTypeService {

    private final ExamTypeRepository examTypeRepository;
    private final AccessControlService accessControlService;

    public ExamTypeService(ExamTypeRepository examTypeRepository,
                           AccessControlService accessControlService) {
        this.examTypeRepository = examTypeRepository;
        this.accessControlService = accessControlService;
    }

    @Transactional
    public List<ExamTypeResponse> findAll() {
        return examTypeRepository.findAllOrderedByCode()
                .stream().map(ExamTypeResponse::from)
                .toList();
    }

    /**
     * Bancos visibles para el usuario: todos si es ADMIN/CREATOR; solo los
     * asignados si es un usuario normal.
     */
    @Transactional
    public List<ExamTypeResponse> findAllFor(String username) {
        if (accessControlService.hasGlobalBankAccess(username)) {
            return findAll();
        }
        Set<String> allowed = accessControlService.allowedBankCodes(username);
        return examTypeRepository.findAllOrderedByCode().stream()
                .filter(et -> allowed.contains(et.getCode()))
                .map(ExamTypeResponse::from)
                .toList();
    }
}
