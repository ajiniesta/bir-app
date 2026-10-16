package bir.app.api.service;

import bir.app.api.dto.RegisterRequest;
import bir.app.api.dto.UserResponse;
import bir.app.api.entity.AppUser;
import bir.app.api.repository.AppUserRepository;
import bir.app.api.security.BcryptPasswordEncoder;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

import java.util.NoSuchElementException;

@Singleton
public class AppUserService {

    private final AppUserRepository userRepository;
    private final BcryptPasswordEncoder passwordEncoder;

    public AppUserService(AppUserRepository userRepository, BcryptPasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
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
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public AppUser requireByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado: " + username));
    }
}
