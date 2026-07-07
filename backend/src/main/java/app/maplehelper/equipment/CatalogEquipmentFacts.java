package app.maplehelper.equipment;

import java.util.Map;

public record CatalogEquipmentFacts(
        String name,
        EquipmentSlot slot,
        Integer levelRequirement,
        StarForceProfile starForceProfile,
        Map<EquipmentStat, Integer> baseStats
) {
}
