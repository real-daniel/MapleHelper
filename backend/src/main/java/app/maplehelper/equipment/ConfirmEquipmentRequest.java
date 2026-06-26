package app.maplehelper.equipment;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ConfirmEquipmentRequest(
        Long characterProfileId,

        @NotNull
        EquipmentSlot slot,

        @NotBlank
        @Size(max = 120)
        String name,

        @Min(0)
        @Max(300)
        Integer levelRequirement,

        @Min(0)
        @Max(25)
        Integer starForce,

        @Size(max = 4000)
        String statLines,

        @Size(max = 30)
        String potentialTier,

        @Size(max = 4000)
        String potentialLines,

        @Size(max = 30)
        String bonusPotentialTier,

        @Size(max = 4000)
        String bonusPotentialLines,

        @Size(max = 8000)
        String rawExtractedText
) {
}
