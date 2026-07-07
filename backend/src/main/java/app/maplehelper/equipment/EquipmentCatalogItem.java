package app.maplehelper.equipment;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Table("equipment_catalog_items")
public record EquipmentCatalogItem(
        @Id Long id,
        EquipmentSlot slot,
        String name,
        Integer levelRequirement,
        String progressionStage,
        String setName,
        String familyKey,
        String variantGroup,
        String jobGroup,
        Boolean namePattern,
        String baseStats,
        StarForceProfile starForceProfile,
        String notes
) {
}
