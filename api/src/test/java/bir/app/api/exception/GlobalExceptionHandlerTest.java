package bir.app.api.exception;

import io.micronaut.http.HttpMethod;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.NoSuchElementException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("GlobalExceptionHandler")
class GlobalExceptionHandlerTest {

    @Mock
    HttpRequest<?> request;

    GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> body(HttpResponse<?> response) {
        return (Map<String, Object>) response.body();
    }

    @Test
    @DisplayName("convierte NoSuchElementException en 404")
    void notFound() {
        HttpResponse<?> response = handler.handle(request, new NoSuchElementException("No existe"));

        assertThat(response.getStatus().getCode()).isEqualTo(404);
        assertThat(body(response)).containsEntry("error", "No existe");
    }

    @Test
    @DisplayName("convierte IllegalArgumentException en 400")
    void badRequest() {
        HttpResponse<?> response = handler.handle(request, new IllegalArgumentException("Dato inválido"));

        assertThat(response.getStatus().getCode()).isEqualTo(400);
        assertThat(body(response)).containsEntry("error", "Dato inválido");
    }

    @Test
    @DisplayName("convierte ForbiddenException en 403")
    void forbidden() {
        HttpResponse<?> response = handler.handle(request, new ForbiddenException("Sin acceso"));

        assertThat(response.getStatus().getCode()).isEqualTo(403);
        assertThat(body(response)).containsEntry("error", "Sin acceso");
    }

    @Test
    @DisplayName("convierte cualquier otra excepción en 500 sin filtrar detalles")
    void internalServerError() {
        when(request.getMethod()).thenReturn(HttpMethod.GET);
        when(request.getPath()).thenReturn("/api/questions");

        HttpResponse<?> response = handler.handle(request, new RuntimeException("password=secreto"));

        assertThat(response.getStatus().getCode()).isEqualTo(500);
        assertThat(body(response)).containsEntry("error", "Internal server error");
    }
}
