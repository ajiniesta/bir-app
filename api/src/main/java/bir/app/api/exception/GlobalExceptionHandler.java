package bir.app.api.exception;

import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.server.exceptions.ExceptionHandler;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.NoSuchElementException;

@Produces
@Singleton
public class GlobalExceptionHandler implements ExceptionHandler<Exception, HttpResponse<?>> {

    private static final Logger LOG = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @Override
    public HttpResponse<?> handle(HttpRequest request, Exception exception) {
        if (exception instanceof NoSuchElementException) {
            return HttpResponse.notFound(Map.of("error", exception.getMessage()));
        }
        if (exception instanceof IllegalArgumentException) {
            return HttpResponse.badRequest(Map.of("error", exception.getMessage()));
        }
        LOG.error("Unhandled exception processing {} {}", request.getMethod(), request.getPath(), exception);
        return HttpResponse.serverError(Map.of("error", "Internal server error"));
    }
}
