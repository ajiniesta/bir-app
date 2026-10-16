package bir.app.api.security;

import at.favre.lib.crypto.bcrypt.BCrypt;
import jakarta.inject.Singleton;

/**
 * Envoltorio de BCrypt (librería {@code at.favre.lib:bcrypt}). Micronaut Security
 * 4.x no incluye un {@code PasswordEncoder} propio, así que aportamos el nuestro.
 */
@Singleton
public class BcryptPasswordEncoder {

    private static final int COST = 12;

    public String encode(String rawPassword) {
        return BCrypt.withDefaults().hashToString(COST, rawPassword.toCharArray());
    }

    public boolean matches(String rawPassword, String encodedPassword) {
        if (rawPassword == null || encodedPassword == null) {
            return false;
        }
        return BCrypt.verifyer().verify(rawPassword.toCharArray(), encodedPassword).verified;
    }
}
