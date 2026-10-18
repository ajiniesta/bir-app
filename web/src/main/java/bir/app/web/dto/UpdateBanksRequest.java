package bir.app.web.dto;

import io.micronaut.serde.annotation.Serdeable;

import java.util.List;

/** Espejo de {@code bir.app.api.dto.UpdateBanksRequest}. */
@Serdeable
public record UpdateBanksRequest(List<String> examTypeCodes) {}
