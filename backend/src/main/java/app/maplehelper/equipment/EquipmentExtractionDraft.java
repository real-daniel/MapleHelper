package app.maplehelper.equipment;

public record EquipmentExtractionDraft(
        String originalFilename,
        long imageBytes,
        EquipmentSlot slot,
        String name,
        Integer levelRequirement,
        Integer starForce,
        String statLines,
        String potentialTier,
        String potentialLines,
        String bonusPotentialTier,
        String bonusPotentialLines,
        String rawExtractedText,
        String extractionStatus,
        String extractionNotes
) {
}
