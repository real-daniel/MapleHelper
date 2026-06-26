package app.maplehelper.equipment;

public record ParsedEquipmentText(
        EquipmentSlot slot,
        String name,
        Integer levelRequirement,
        Integer starForce,
        String statLines,
        String potentialTier,
        String potentialLines,
        String bonusPotentialTier,
        String bonusPotentialLines
) {
}
