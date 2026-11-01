import { describe, expect, it } from "vitest";
import { starForceBonuses } from "./star-force";

describe("Star Force semantic rules", () => {
  it("adds only Max HP to eligible armor and no HP to excluded slots", () => {
    expect(starForceBonuses({ slot: "RING", levelRequirement: 200, starForceProfile: "ARMOR_ACCESSORY", baseStats: {} }, 15)).toMatchObject({ MAX_HP: 255 });
    expect(starForceBonuses({ slot: "RING", levelRequirement: 200, starForceProfile: "ARMOR_ACCESSORY", baseStats: {} }, 15)).not.toHaveProperty("MAX_MP");
    expect(starForceBonuses({ slot: "EARRINGS", levelRequirement: 200, starForceProfile: "ARMOR_ACCESSORY", baseStats: {} }, 15)).not.toHaveProperty("MAX_HP");
  });

  it("grants both glove attack stats independently of base attack", () => {
    expect(starForceBonuses({ slot: "GLOVES", levelRequirement: 200, starForceProfile: "ARMOR_ACCESSORY", baseStats: { ATTACK_POWER: 10 } }, 15)).toMatchObject({ ATTACK_POWER: 7, MAGIC_ATTACK: 7 });
  });

  it("uses the separate weapon attack table and preserves weapon HP and MP", () => {
    expect(starForceBonuses({ slot: "WEAPON", levelRequirement: 200, starForceProfile: "WEAPON", baseStats: { ATTACK_POWER: 340 } }, 22)).toMatchObject({
      ATTACK_POWER: 228, MAX_HP: 255, MAX_MP: 255,
    });
    expect(starForceBonuses({ slot: "WEAPON", levelRequirement: 250, starForceProfile: "WEAPON", baseStats: { ATTACK_POWER: 400 } }, 30)).toMatchObject({
      ATTACK_POWER: 619, MAX_HP: 255, MAX_MP: 255,
    });
  });

  it("applies the defense increase twice per star to overalls", () => {
    expect(starForceBonuses({ name: "Arcane Umbra Mage Suit", slot: "TOP", levelRequirement: 200, starForceProfile: "ARMOR_ACCESSORY", baseStats: { DEFENSE: 300 } }, 1)).toMatchObject({ DEFENSE: 32 });
  });

  it("uses Superior equipment tables", () => {
    expect(starForceBonuses({ slot: "RING", levelRequirement: 150, starForceProfile: "SUPERIOR", baseStats: { DEFENSE: 150 } }, 15)).toMatchObject({
      STR: 115, DEX: 115, INT: 115, LUK: 115, ATTACK_POWER: 150, MAGIC_ATTACK: 150,
    });
  });

  it("treats Astra secondaries as level-200 armor except weapon-rule variants", () => {
    expect(starForceBonuses({ name: "Astra Sacred Aegis", slot: "SECONDARY", levelRequirement: 200, starForceProfile: "NONE", baseStats: { STR: 40, DEX: 10 } }, 22)).toMatchObject({ STR: 145, DEX: 145, ATTACK_POWER: 106 });
    expect(starForceBonuses({ name: "Astra Katara", slot: "SECONDARY", levelRequirement: 200, starForceProfile: "NONE", baseStats: { ATTACK_POWER: 225 } }, 22)).toMatchObject({ ATTACK_POWER: 188, MAX_HP: 255, MAX_MP: 255 });
  });

  it("supports Star Force badges without adding armor attack or HP", () => {
    const result = starForceBonuses({ name: "Ghost Ship Exorcist", slot: "BADGE", levelRequirement: 150, starForceProfile: "NONE", baseStats: {} }, 22);
    expect(result).toMatchObject({ STR: 117, DEX: 117, INT: 117, LUK: 117 });
    expect(result).not.toHaveProperty("ATTACK_POWER");
    expect(result).not.toHaveProperty("MAX_HP");
  });
});
