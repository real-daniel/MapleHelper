import { describe, expect, it } from "vitest";
import { astraBaseStatsForStage, astraStarForceCap, BLACK_HEART_STAR_FORCE, fixedWeaponStarForce, isBlackHeart, itemStarForceCap, supportsFlames, supportsItemPotential } from "./equipment-rules";

describe("equipment semantic rules", () => {
  it("uses Astra liberation phase star caps", () => {
    expect(astraStarForceCap("Astra", 1)).toBe(15);
    expect(astraStarForceCap("Astra", 2)).toBe(20);
    expect(astraStarForceCap("Astra", 3)).toBe(30);
    expect(astraStarForceCap("Astra Katara", 1)).toBe(30);
    expect(astraStarForceCap("Astra Talisman", 1)).toBe(30);
    expect(astraStarForceCap("Astra", 1, "Dual Blade")).toBe(30);
    expect(astraStarForceCap("Astra", 1, "Kanna")).toBe(30);
  });

  it("uses phase-specific Astra base stats", () => {
    expect(astraBaseStatsForStage("Astra Bladebinder", { STR: 10, DEX: 10, "Attack Power": 7 }, 3)).toEqual({ STR: 20, DEX: 20, "Attack Power": 7 });
    expect(astraBaseStatsForStage("Astra Katara", { STR: 10, DEX: 10, LUK: 80, "Attack Power": 225 }, 3)).toEqual({ STR: 30, DEX: 30, LUK: 100, "Attack Power": 225 });
    expect(astraBaseStatsForStage("Astra Talisman", { INT: 75, LUK: 75, "Magic Attack": 260 }, 2)).toEqual({ INT: 85, LUK: 85, "Magic Attack": 260 });
    expect(astraBaseStatsForStage("Astra Deca Core Controller", { STR: 5, DEX: 5, INT: 5, LUK: 5, "Max HP": 1000 }, 2)).toEqual({ STR: 7, DEX: 7, INT: 7, LUK: 7, "Max HP": 1000 });
  });

  it("enforces flame exclusions and documented exceptions", () => {
    expect(supportsFlames("SECONDARY", "Astra")).toBe(false);
    expect(supportsFlames("RING", "Endless Terror")).toBe(false);
    expect(supportsFlames("MEDAL", "Immortal Legacy")).toBe(true);
    expect(supportsFlames("SHOULDER", "Scarlet Shoulder")).toBe(true);
    expect(supportsFlames("POCKET", "Cursed Spellbook")).toBe(true);
  });

  it("supports potential only on eligible items", () => {
    expect(supportsItemPotential("BADGE", "Ghost Ship Exorcist")).toBe(true);
    expect(supportsItemPotential("BADGE", "Genesis Badge")).toBe(false);
    expect(supportsItemPotential("HEART", "Fairy Heart")).toBe(true);
    expect(supportsItemPotential("POCKET", "Pink Holy Cup")).toBe(false);
    expect(supportsItemPotential("RING", "Ring of Restraint")).toBe(false);
  });

  it("does not offer Star Force for catalog items marked ineligible", () => {
    expect(itemStarForceCap("RING", "Event Ring", 120, "NONE", null)).toBe(0);
    expect(itemStarForceCap("SECONDARY", "Astra", 200, "NONE", 3)).toBe(30);
    expect(itemStarForceCap("HAT", "Eternal Hat", 250, "ARMOR_ACCESSORY", null)).toBe(30);
    expect(itemStarForceCap("BADGE", "Ghost Ship Exorcist", 150, "NONE", null)).toBe(22);
    expect(itemStarForceCap("WEAPON", "Genesis Dual Bowguns", 200, "WEAPON", null)).toBe(22);
    expect(itemStarForceCap("WEAPON", "Destiny Dual Bowguns", 250, "WEAPON", null)).toBe(22);
    expect(itemStarForceCap("HEART", "Fairy Heart", 100, "ARMOR_ACCESSORY", null)).toBe(8);
    expect(itemStarForceCap("HEART", "Plasma Heart", 130, "ARMOR_ACCESSORY", null)).toBe(20);
    expect(itemStarForceCap("HEART", "Total Control", 200, "ARMOR_ACCESSORY", null)).toBe(30);
    expect(itemStarForceCap("HEART", "Black Heart", 120, "NONE", null)).toBe(BLACK_HEART_STAR_FORCE);
    expect(itemStarForceCap("HEART", "Fairy Heart", 100, "NONE", null)).toBe(8);
    expect(isBlackHeart("HEART", "Black Heart")).toBe(true);
  });

  it("locks Genesis and Destiny Star Force to their completed phase values", () => {
    expect(fixedWeaponStarForce("WEAPON", "Genesis Bladecaster", null)).toBe(22);
    expect(fixedWeaponStarForce("WEAPON", "Destiny Bladecaster", 1)).toBe(22);
    expect(fixedWeaponStarForce("WEAPON", "Destiny Bladecaster", 2)).toBe(25);
    expect(itemStarForceCap("WEAPON", "Destiny Bladecaster", 250, "WEAPON", null, "Adele", 1)).toBe(22);
    expect(itemStarForceCap("WEAPON", "Destiny Bladecaster", 250, "WEAPON", null, "Adele", 2)).toBe(25);
  });
});
