package app.maplehelper.profile;

import app.maplehelper.character.RankingRegion;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateCharacterProfileRequest(
        @NotBlank
        @Size(max = 20)
        @Pattern(regexp = "^[A-Za-z0-9]+$", message = "must contain only letters and numbers")
        String name,
        @NotNull RankingRegion region
) {
}
