import { describe, expect, it } from "vitest";
import { equipmentJobGroup, resolveEquipmentName } from "./equipment-names";

describe("class-specific equipment names", () => {
  it("maps character jobs to their equipment group", () => {
    expect(equipmentJobGroup("Hero")).toBe("Warrior");
    expect(equipmentJobGroup("Bishop")).toBe("Magician");
    expect(equipmentJobGroup("Wind Archer")).toBe("Bowman");
    expect(equipmentJobGroup("Dual Blade")).toBe("Thief");
    expect(equipmentJobGroup("Angelic Buster")).toBe("Pirate");
  });

  it("expands generic class-set armor to its exact in-game name", () => {
    expect(resolveEquipmentName("Chaos Root Abyss", "HAT", "Hero")).toBe("Royal Warrior Helm");
    expect(resolveEquipmentName("Chaos Root Abyss", "TOP", "Bishop")).toBe("Eagle Eye Dunwitch Robe");
    expect(resolveEquipmentName("Chaos Root Abyss", "BOTTOM", "Night Lord")).toBe("Trixter Assassin Pants");
    expect(resolveEquipmentName("Absolab", "GLOVES", "Night Lord")).toBe("AbsoLab Bandit Gloves");
    expect(resolveEquipmentName("Absolab", "SHOULDER", "Angelic Buster")).toBe("AbsoLab Pirate Shoulder");
    expect(resolveEquipmentName("Arcane", "CAPE", "Wind Archer")).toBe("Arcane Umbra Archer Cape");
    expect(resolveEquipmentName("Arcane Umbra", "SHOES", "Bishop")).toBe("Arcane Umbra Mage Shoes");
    expect(resolveEquipmentName("Eternal", "SHOES", "Hero")).toBe("Eternal Knight Shoes");
    expect(resolveEquipmentName("Eternal", "TOP", "Bishop")).toBe("Eternal Mage Robe");
    expect(resolveEquipmentName("Eternal", "HAT", "Night Lord")).toBe("Eternal Thief Bandana");
    expect(resolveEquipmentName("Mitra's Rage", "EMBLEM", "Wind Archer")).toBe("Mitra's Rage: Bowman");
    expect(resolveEquipmentName("Eternal", "WEAPON", "Hero")).toBe("Eternal");
  });

  it("leaves exact and non-Eternal names unchanged", () => {
    expect(resolveEquipmentName("Eternal Knight Shoes", "SHOES", "Hero")).toBe("Eternal Knight Shoes");
    expect(resolveEquipmentName("Guardian Angel Ring", "RING", "Hero")).toBe("Guardian Angel Ring");
  });
});
