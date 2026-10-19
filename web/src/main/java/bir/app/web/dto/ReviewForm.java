package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

/** Veredicto del revisor desde la bandeja de revisión. */
@Serdeable
public record ReviewForm(String status, String note) {}
