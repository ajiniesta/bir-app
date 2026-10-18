package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/** Formulario de asignación de bancos de preguntas (checkboxes repetidos). */
@Serdeable
public record BanksForm(List<String> banks) {}
