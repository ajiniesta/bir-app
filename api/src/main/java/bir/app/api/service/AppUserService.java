package bir.app.api.service;

import bir.app.api.dto.AdminUserResponse;
import bir.app.api.dto.RegisterRequest;
import bir.app.api.dto.UserResponse;
import bir.app.api.entity.AppUser;
import bir.app.api.entity.ExamType;
import bir.app.api.entity.UserRole;
import bir.app.api.repository.AppUserRepository;
import bir.app.api.repository.ExamTypeRepository;
import bir.app.api.security.BcryptPasswordEncoder;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;

@Singleton
public class AppUserService {

    private final AppUserRepository userRepository;
    private final ExamTypeRepository examTypeRepository;
    private final BcryptPasswordEncoder passwordEncoder;

    public AppUserService(AppUserRepository userRepository,
                          ExamTypeRepository examTypeRepository,
                          BcryptPasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.examTypeRepository = examTypeRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        String username = request.username().trim();
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("El nombre de usuario ya está en uso: " + username);
        }
        AppUser user = new AppUser();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(request.displayName() == null || request.displayName().isBlank()
                ? username
                : request.displayName().trim());
        // Todo usuario que se registra solo entra como usuario normal, sin bancos.
        user.setRole(UserRole.USER);
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public AppUser requireByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado: " + username));
    }

    @Transactional
    public AppUser requireById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado: " + id));
    }

    /** Rol del usuario. */
    @Transactional
    public UserRole role(String username) {
        return requireByUsername(username).getRole();
    }

    /** Códigos de los bancos de preguntas asignados al usuario. */
    @Transactional
    public Set<String> allowedBankCodes(String username) {
        return requireByUsername(username).getAllowedExamTypes().stream()
                .map(ExamType::getCode)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
    }

    // --- Administración ------------------------------------------------------

    @Transactional
    public List<AdminUserResponse> listUsers() {
        return userRepository.findAll().stream()
                .map(AdminUserResponse::from)
                .toList();
    }

    @Transactional
    public AdminUserResponse updateRole(Long userId, String roleName) {
        AppUser user = requireById(userId);
        user.setRole(parseRole(roleName));
        return AdminUserResponse.from(userRepository.save(user));
    }

    /** Reemplaza el conjunto de bancos asignados a un usuario. */
    @Transactional
    public AdminUserResponse updateAllowedBanks(Long userId, List<String> examTypeCodes) {
        AppUser user = requireById(userId);

        Set<String> wanted = new HashSet<>();
        if (examTypeCodes != null) {
            examTypeCodes.stream()
                    .filter(code -> code != null && !code.isBlank())
                    .map(code -> code.trim().toUpperCase())
                    .forEach(wanted::add);
        }

        Set<ExamType> resolved = new HashSet<>(examTypeRepository.findByCodeIn(wanted));
        if (resolved.size() != wanted.size()) {
            Set<String> found = resolved.stream().map(ExamType::getCode).collect(java.util.stream.Collectors.toSet());
            Set<String> unknown = new HashSet<>(wanted);
            unknown.removeAll(found);
            throw new NoSuchElementException("Tipo de examen no encontrado: " + unknown);
        }

        user.getAllowedExamTypes().clear();
        user.getAllowedExamTypes().addAll(resolved);
        return AdminUserResponse.from(userRepository.save(user));
    }

    private static UserRole parseRole(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            throw new IllegalArgumentException("El rol es obligatorio");
        }
        try {
            return UserRole.valueOf(roleName.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Rol no válido: " + roleName + " (usa ADMIN, CREATOR o USER)");
        }
    }
}
