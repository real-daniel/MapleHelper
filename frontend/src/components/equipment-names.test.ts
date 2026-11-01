import { describe, expect, it } from "vitest";
import { equipmentJobGroup, equipmentJobGroups, isEquipmentJobGroupCompatible, resolveEquipmentName, type EquipmentJobGroup } from "./equipment-names";

const CURRENT_GMS_JOBS: Record<EquipmentJobGroup, string[]> = {
  Warrior: ["Hero", "Paladin", "Dark Knight", "Dawn Warrior", "Mihile", "Aran", "Demon Slayer", "Demon Avenger", "Blaster", "Kaiser", "Adele", "Zero", "Hayato", "Ren", "Erel Light"],
  Magician: ["Arch Mage (F/P)", "Arch Mage (I/L)", "Bishop", "Blaze Wizard", "Battle Mage", "Evan", "Luminous", "Kinesis", "Illium", "Lara", "Kanna", "Lynn", "Sia Astelle"],
  Bowman: ["Bow Master", "Marksman", "Pathfinder", "Wind Archer", "Wild Hunter", "Mercedes", "Kain"],
  Thief: ["Night Lord", "Shadower", "Blade Master", "Night Walker", "Phantom", "Cadena", "Khali", "Hoyoung", "Xenon"],
  Pirate: ["Buccaneer", "Cannon Master", "Corsair", "Thunder Breaker", "Shade", "Ark", "Angelic Buster", "Mechanic", "Mo Xuan", "Xenon"],
};

describe("class-specific equipment names", () => {
  it.each(Object.entries(CURRENT_GMS_JOBS).flatMap(([group, jobs]) => jobs.map((job) => [job, group])))
  ("maps %s to %s equipment", (job, group) => {
    expect(equipmentJobGroups(job)).toContain(group);
  });

  it("supports current Nexon labels, legacy aliases, hybrids, and beginners", () => {
    expect(equipmentJobGroup("Bowmaster")).toBe("Bowman");
    expect(equipmentJobGroup("Dual Blade")).toBe("Thief");
    expect(equipmentJobGroup("Cannoneer")).toBe("Pirate");
    expect(equipmentJobGroup("Erel")).toBe("Warrior");
    expect(equipmentJobGroups("Xenon")).toEqual(["Thief", "Pirate"]);
    expect(equipmentJobGroups("Noblesse")).toEqual([]);
  });

  it("does not expose class-restricted equipment when a job is unknown", () => {
    expect(isEquipmentJobGroupCompatible("Warrior", "Unknown New Class")).toBe(false);
    expect(isEquipmentJobGroupCompatible("Magician", "Erel")).toBe(false);
    expect(isEquipmentJobGroupCompatible("Warrior", "Erel")).toBe(true);
    expect(isEquipmentJobGroupCompatible("Pirate", "Xenon")).toBe(true);
    expect(isEquipmentJobGroupCompatible(null, "Unknown New Class")).toBe(true);
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
