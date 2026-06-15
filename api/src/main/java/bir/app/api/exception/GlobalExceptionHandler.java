package bir.app.api.exception;

import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.server.exceptions.ExceptionHandler;
import jakarta.inject.Singleton;

import java.util.Map;
import java.util.NoSuchElementException;

@Produces
@Singleton
public class GlobalExceptionHandler implements ExceptionHandler<Exception, HttpResponse<?>> {

    @Override
    public HttpResponse<?> handle(HttpRequest request, Exception exception) {
        if (exception instanceof NoSuchElementException) {
            return HttpResponse.notFound(Map.of("error", exception.getMessage()));
        }
        if (exception instanceof IllegalArgumentException) {
            return HttpResponse.badRequest(Map.of("error", exception.getMessage()));
        }
        return HttpResponse.serverError(Map.of("error", "Internal server error"));
    }
}
