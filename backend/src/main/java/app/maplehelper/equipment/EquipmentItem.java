package app.maplehelper.equipment;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;

@Table("equipment_items")
public record EquipmentItem(
        @Id Long id,
        @JsonIgnore Long appUserId,
        Long characterProfileId,
        EquipmentSlot slot,
        Integer slotIndex,
        String name,
        Integer levelRequirement,
        Integer starForce,
        String statLines,
        String flameStats,
        String flameScoreLines,
        String potentialTier,
        String potentialLines,
        String bonusPotentialTier,
        String bonusPotentialLines,
        String rawExtractedText,
        Instant createdAt,
        Instant updatedAt
) {
}
