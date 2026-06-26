package app.maplehelper.profile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateCharacterProfileRequest(
        @NotBlank @Size(max = 40) String world,
        @NotBlank @Size(max = 80) String job
) {
}
