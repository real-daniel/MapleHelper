import type { EquipmentSlot } from "../types";

export function equipmentSlotCapacity(slot: EquipmentSlot): number {
  if (slot === "RING") return 4;
  if (slot === "PENDANT") return 2;
  if (slot === "TOTEM") return 3;
  return 1;
}

export function resolveEquipmentSlotIndex(
  slot: EquipmentSlot,
  requestedIndex: number | null,
  occupiedIndexes: readonly (number | null)[],
): number | null {
  const capacity = equipmentSlotCapacity(slot);
  if (capacity <= 1) return null;
  for (let candidate = 1; candidate <= capacity; candidate++) {
    if (!occupiedIndexes.includes(candidate)) return candidate;
  }
  return requestedIndex != null && requestedIndex >= 1 && requestedIndex <= capacity ? requestedIndex : 1;
}
