import { describe, expect, it } from "vitest";
import { equipmentJobGroup, equipmentJobGroups, isEquipmentJobGroupCompatible, isEquipmentSubclassCompatible, resolveEquipmentName, type EquipmentJobGroup } from "./equipment-names";

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

describe("subclass-specific weapons", () => {
  it("shows Genesis and Destiny weapons only to jobs that use their weapon type", () => {
    expect(isEquipmentSubclassCompatible("WEAPON", 1522000, "Genesis Dual Bowguns", "Mercedes")).toBe(true);
    expect(isEquipmentSubclassCompatible("WEAPON", 1522000, "Destiny Dual Bowguns", "Bow Master")).toBe(false);
    expect(isEquipmentSubclassCompatible("WEAPON", 1452000, "Genesis Bow", "Mercedes")).toBe(false);
    expect(isEquipmentSubclassCompatible("WEAPON", 1592000, "Destiny Ancient Bow", "Pathfinder")).toBe(true);
    expect(isEquipmentSubclassCompatible("WEAPON", 1215000, "Genesis Sword", "Ren")).toBe(true);
    expect(isEquipmentSubclassCompatible("WEAPON", 1253000, "Destiny Celestial Light", "Sia Astelle")).toBe(true);
    expect(isEquipmentSubclassCompatible("WEAPON", 1242000, "Genesis Energy Chain", "Xenon")).toBe(true);
    expect(isEquipmentSubclassCompatible("WEAPON", 1242000, "Genesis Energy Chain", "Shadower")).toBe(false);
  });

  it("keeps shared weapon types available only to their valid jobs", () => {
    expect(isEquipmentSubclassCompatible("WEAPON", 1402000, "Genesis Two-handed Sword", "Hero")).toBe(true);
    expect(isEquipmentSubclassCompatible("WEAPON", 1402000, "Genesis Two-handed Sword", "Dawn Warrior")).toBe(true);
    expect(isEquipmentSubclassCompatible("WEAPON", 1402000, "Genesis Two-handed Sword", "Dark Knight")).toBe(false);
    expect(isEquipmentSubclassCompatible("WEAPON", 1342000, "Arcane Umbra Katara", "Blade Master")).toBe(false);
  });
});

describe("subclass-specific secondary weapons", () => {
  it("filters Princess No secondaries to their exact jobs", () => {
    expect(isEquipmentSubclassCompatible("SECONDARY", 1352009, "Princess No's Accursed Arrow", "Mercedes")).toBe(true);
    expect(isEquipmentSubclassCompatible("SECONDARY", 1352009, "Princess No's Accursed Arrow", "Bow Master")).toBe(false);
    expect(isEquipmentSubclassCompatible("SECONDARY", 1352975, "Princess No's Floral Jewel", "Night Walker")).toBe(true);
    expect(isEquipmentSubclassCompatible("SECONDARY", 1352975, "Princess No's Floral Jewel", "Night Lord")).toBe(false);
    expect(isEquipmentSubclassCompatible("SECONDARY", 1099011, "Princess No's Accursed Shield", "Demon Avenger")).toBe(true);
  });

  it("filters Astra secondaries while preserving legitimate shared variants", () => {
    expect(isEquipmentSubclassCompatible("SECONDARY", 1092123, "Astra Sacred Aegis", "Hero")).toBe(true);
    expect(isEquipmentSubclassCompatible("SECONDARY", 1092123, "Astra Sacred Aegis", "Paladin")).toBe(true);
    expect(isEquipmentSubclassCompatible("SECONDARY", 1092123, "Astra Sacred Aegis", "Dark Knight")).toBe(false);
    expect(isEquipmentSubclassCompatible("SECONDARY", 1342121, "Astra Katara", "Blade Master")).toBe(true);
    expect(isEquipmentSubclassCompatible("SECONDARY", 1342121, "Astra Katara", "Shadower")).toBe(false);
    expect(isEquipmentSubclassCompatible("SECONDARY", null, "Astra Future Secondary", "Hero")).toBe(false);
  });

  it("shows each class its actual level-100 emblem family", () => {
    expect(isEquipmentSubclassCompatible("EMBLEM", 1190301, "Gold Maple Leaf Emblem", "Hero")).toBe(true);
    expect(isEquipmentSubclassCompatible("EMBLEM", 1190301, "Gold Maple Leaf Emblem", "Kaiser")).toBe(false);
    expect(isEquipmentSubclassCompatible("EMBLEM", 1190513, "Gold Heroes Emblem", "Mercedes")).toBe(true);
    expect(isEquipmentSubclassCompatible("EMBLEM", 1190201, "Hybrid Heart", "Xenon")).toBe(true);
    expect(isEquipmentSubclassCompatible("EMBLEM", 1190101, "Angel Emblem", "Angelic Buster")).toBe(true);
    expect(isEquipmentSubclassCompatible("EMBLEM", 1190565, "Gold Sword Emblem", "Ren")).toBe(true);
    expect(isEquipmentSubclassCompatible("EMBLEM", 1191113, "Gold Guardian Emblem", "Sia Astelle")).toBe(true);
    expect(isEquipmentSubclassCompatible("EMBLEM", 1191115, "Gold Knight Emblem", "Erel Light")).toBe(true);
    expect(isEquipmentSubclassCompatible("EMBLEM", 1191115, "Gold Knight Emblem", "Adele")).toBe(false);
  });

  it("does not affect universal secondary items or other slots", () => {
    expect(isEquipmentSubclassCompatible("SECONDARY", null, "Generic Secondary", "Hero")).toBe(true);
    expect(isEquipmentSubclassCompatible("HAT", 1000000, "Eternal Mage Hat", "Hero")).toBe(true);
  });
});
