package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public record AnswerRequest(Integer position, String letter) {}
