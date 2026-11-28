package bir.app.api.dto;

import io.micronaut.core.annotation.Nullable;
import io.micronaut.serde.annotation.Serdeable;
import java.util.List;

@Serdeable
public record CreateReviewSessionRequest(
    String examTypeCode,
    List<String> categories,
    List<String> tags,
    @Nullable Boolean onlyDoubt,
    @Nullable Boolean onlyFailed
) {
    public CreateReviewSessionRequest(String examTypeCode, List<String> categories, List<String> tags) {
        this(examTypeCode, categories, tags, false, false);
    }

    public CreateReviewSessionRequest(String examTypeCode, List<String> categories, List<String> tags, @Nullable Boolean onlyDoubt) {
        this(examTypeCode, categories, tags, onlyDoubt, false);
    }
}
