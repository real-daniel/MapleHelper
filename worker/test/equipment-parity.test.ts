import { describe, expect, it } from "vitest";
import {
  deriveFlameScoreLines,
  deriveFlameStats,
  isSweetwaterItem,
  preferredFlameStats,
  starForceContribution,
} from "../src/equipment/calculators";
import {
  findBestCatalogFacts,
  findSkillRingName,
  isSkillRing,
  normalizeCatalogSlot,
  type CatalogEquipmentFacts,
  type ParsedEquipmentText,
} from "../src/equipment/domain";
import { parseEquipmentText } from "../src/equipment/parser";
import { resolveEquipmentSlotIndex } from "../src/equipment/slots";
import { formatStatEquivalencies, parseStatEquivalencyText } from "../src/equipment/stat-equivalencies";

const catalog: CatalogEquipmentFacts[] = [
  {
    name: "Eternal Knight Pants", slot: "BOTTOM", levelRequirement: 250, starForceProfile: "ARMOR_ACCESSORY",
    baseStats: { STR: 50, DEX: 50, INT: 0, LUK: 0, ALL_STATS: 0, MAX_HP: 0, ATTACK_POWER: 6, MAGIC_ATTACK: 0, DEFENSE: 325 },
  },
  {
    name: "Eternal Knight Gloves", slot: "GLOVES", levelRequirement: 250, starForceProfile: "ARMOR_ACCESSORY",
    baseStats: { STR: 55, DEX: 55, INT: 0, LUK: 0, ALL_STATS: 0, ATTACK_POWER: 12, MAGIC_ATTACK: 0, DEFENSE: 325 },
  },
  {
    name: "Sweetwater Tattoo", slot: "FACE", levelRequirement: 160, starForceProfile: "ARMOR_ACCESSORY",
    baseStats: { STR: 5, DEX: 5, INT: 5, LUK: 5, ALL_STATS: 0, MAX_HP: 120, MAX_MP: 120, DEFENSE: 38 },
  },
  {
    name: "Source of Suffering", slot: "PENDANT", levelRequirement: 160, starForceProfile: "ARMOR_ACCESSORY",
    baseStats: { STR: 10, DEX: 10, INT: 10, LUK: 10, ALL_STATS: 0, ATTACK_POWER: 3, MAGIC_ATTACK: 3, DEFENSE: 200 },
  },
  {
    name: "Destiny Bladecaster", slot: "WEAPON", levelRequirement: 250, starForceProfile: "WEAPON",
    baseStats: { STR: 190, DEX: 190, INT: 0, LUK: 0, ALL_STATS: 0, ATTACK_POWER: 373, MAGIC_ATTACK: 0, BOSS_DAMAGE: 30, ENEMY_DEFENSE_IGNORED: 20 },
  },
];

function parsed(slot: ParsedEquipmentText["slot"], name: string, levelRequirement: number, starForce: number, statLines: string, flameStats = ""): ParsedEquipmentText {
  return { slot, name, levelRequirement, starForce, statLines, flameStats, potentialTier: "", potentialLines: "", bonusPotentialTier: "", bonusPotentialLines: "" };
}

describe("legacy equipment text parsing parity", () => {
  it("fuzzy-matches the catalog and canonicalizes OCR stat names", () => {
    const result = parseEquipmentText(`
      S0urce of Sufferlng
      Untradable
      Required Level Lv. 160
      Accessary
      Pendant
      S7R +225 (10 +131 +84)
      Attack P0wer +158 (3 +155)
    `, 25, catalog);
    expect(result.name).toBe("Source of Suffering");
    expect(result.slot).toBe("PENDANT");
    expect(result.statLines).toContain("STR +225 (10 +131 +84)");
    expect(result.statLines).toContain("Attack Power +158 (3 +155)");
  });

  it("does not default an unrecognized slot to weapon", () => {
    expect(parseEquipmentText("Unknown Thing\nUntradable\nRequired Level Lv. 100", 0, catalog).slot).toBeNull();
  });

  it("recognizes skill rings", () => {
    const result = parseEquipmentText("Ring of Restraint\nUntradable\nAccessory\nRing\nUsable Skill [Special Skill Ring] Ring of Restraint Lv. 5", null, catalog);
    expect(result.name).toBe("Ring of Restraint");
    expect(result.slot).toBe("RING");
    expect(isSkillRing("Weapon Jump S Ring")).toBe(true);
    expect(isSkillRing("Crisis HM Ring")).toBe(true);
    expect(isSkillRing("Guardian Angel Ring")).toBe(false);
    expect(findSkillRingName("Usable Skill [Special Skill Ring] Ring of Restraint Lv. 5")).toBe("Ring of Restraint");
  });

  it("ends potential parsing at the soul section", () => {
    const result = parseEquipmentText(`
      Destiny Bladecaster
      Untradable
      Weapon
      Required Level Lv. 250
      Attack Power +902 (373 +261 +268)
      Boss Damage +40% (30% +10%)
      Potential : Legendary
      Boss Damage +45%
      Attack Power +13%
      Attack Power +10%
      Soul : Magnificent Annihilation Weapon Lotus Soul
      Attack Power +3%
    `, 0, catalog);
    expect(result.flameStats).toContain("Attack Power: +268");
    expect(result.flameStats).toContain("Boss Damage: +10%");
    expect(result.potentialLines).toContain("Boss Damage: +45%");
    expect(result.potentialLines).not.toContain("Attack Power: +3%");
  });
});

describe("legacy Star Force and flame calculation parity", () => {
  it("uses the cumulative level-250 Star Force table", () => {
    expect(starForceContribution(catalog[0], "STR", 22)).toBe(159);
    expect(starForceContribution(catalog[0], "ATTACK_POWER", 22)).toBe(120);
    expect(starForceContribution(catalog[0], "ATTACK_POWER", 24)).toBe(168);
    expect(starForceContribution(catalog[0], "MAX_HP", 24)).toBe(255);
    expect(starForceContribution(catalog[0], "INT", 24)).toBe(0);
  });

  it("derives Eternal pants flames from base and Star Force stats", () => {
    const value = parsed("BOTTOM", "Eternal Knight Pants", 250, 24, `STR +332 (50 +159 +123)
DEX +244 (50 +159 +35)
INT +28 (0 +28)
All Stats +5% (0% +5%)
Max HP +258 (0 +256)
Attack Power +174 (6 +168)
Magic ATT +168 (0 +168)
Defense +1070 (325 +745)`);
    expect(deriveFlameStats(value, catalog)).toBe("STR: +123\nDEX: +35\nINT: +28\nAll Stats: +5%");
  });

  it("does not treat Star Force attack as a flame", () => {
    const tattoo = parsed("FACE", "Sweetwater Tattoo", 160, 22, `STR +187 (5 +131 +51)
DEX +136 (5 +131)
INT +151 (5 +131 +15)
LUK +136 (5 +131)
Attack Power +92 (0 +92)
Magic ATT +95 (0 +92 +3)
Defense +132 (108 +24)`);
    expect(deriveFlameStats(tattoo, catalog)).toBe("STR: +51\nINT: +15\nMagic Attack: +3");
    expect(isSweetwaterItem("Sweetwater Tattoo")).toBe(true);
    expect(isSweetwaterItem("Commanding Force Earring")).toBe(false);
  });

  it("ignores tiny OCR differences around an expected zero flame", () => {
    const value = parsed("BOTTOM", "Eternal Knight Pants", 250, 22, "Max HP +258 (0 +256)");
    expect(deriveFlameStats(value, catalog)).toBe("");
  });

  it("does not treat glove Star Force attack as a flame", () => {
    const value = parsed("GLOVES", "Eternal Knight Gloves", 250, 22, `STR +332 (65 +159 +118)
DEX +214 (655 +159)
INT +35 (0 +35)
LUK +35 (0 +35)
All Stats +5% (0% +5%)
Attack Power +139 (12 +127)
Magic Attack +120 (0 +120)
Defense +970 (325 +645)`);
    expect(deriveFlameStats(value, catalog)).toBe("STR: +118\nINT: +35\nLUK: +35\nAll Stats: +5%");
  });

  it("solves hidden flame lines", () => {
    const value = parsed("PENDANT", "Source of Suffering", 160, 25, `STR +225 (10 +131 +84)
DEX +171 (10 +131 +30)
INT +141 (10 +131)
LUK +141 (10 +131)
All Stats +6% (0% +6%)
Attack Power +158 (3 +155)
Magic ATT +158 (3 +155)
Speed +5 (0 +5)`);
    expect(deriveFlameStats(value, catalog)).toBe("STR: +84\nDEX: +30\nAll Stats: +6%\nSpeed: +5");
    expect(deriveFlameScoreLines(value, catalog)).toBe("All Stats: +6% (Tier 6)\nSTR: +54 (Tier 6)\nSTR & DEX: +30 (Tier 6)\nSpeed: +5 (Tier 5)");
  });

  it("solves weapon attack and boss flame tiers", () => {
    const flames = "LUK: +72\nAll Stats: +5%\nAttack Power: +268\nBoss Damage: +10%";
    const value = parsed("WEAPON", "Destiny Bladecaster", 250, 0, "Attack Power +902 (373 +261 +268)\nBoss Damage +40% (30% +10%)", flames);
    expect(deriveFlameStats(value, catalog)).toBe(flames);
    expect(deriveFlameScoreLines(value, catalog)).toBe("All Stats: +5% (Tier 5)\nLUK: +72 (Tier 6)\nAttack Power: +268 (Tier 7)\nBoss Damage: +10% (Tier 5)");
    expect(preferredFlameStats(value, flames, catalog)).toBe(flames);
  });
});

describe("remaining service parity helpers", () => {
  it("selects the first empty multi-slot position and replaces the requested position when full", () => {
    expect(resolveEquipmentSlotIndex("RING", null, [1, 2, 3])).toBe(4);
    expect(resolveEquipmentSlotIndex("RING", 2, [1, 2, 3, 4])).toBe(2);
    expect(resolveEquipmentSlotIndex("BELT", null, [])).toBeNull();
  });

  it("normalizes and deduplicates stat equivalencies", () => {
    const values = parseStatEquivalencyText("Boss Damage 40 3.628\nSTR% 10 1,250\nBoss Damage 50 4.000\nFinal Damage header");
    expect(values).toEqual([
      { stat: "Boss Damage", quantity: 40, finalDamagePercent: 3.628 },
      { stat: "STR%", quantity: 10, finalDamagePercent: 1.25 },
    ]);
    expect(formatStatEquivalencies(values)).toBe("Boss Damage: 40 = 3.628% final damage\nSTR%: 10 = 1.250% final damage");
  });

  it("parses every class stat and common plain-text vision formatting", () => {
    const values = parseStatEquivalencyText([
      "* **INT** | 30 | 0.235%",
      "LUK 30 0.120% final damage",
      "Max HP 5,000 = 0.800% final damage",
      "Magic Attack% | 12 | 4.827%",
      "IED (380) 40 1.361%",
      "Attack | +30 | +0.606%",
    ].join("\n"));
    expect(values).toEqual([
      { stat: "INT", quantity: 30, finalDamagePercent: 0.235 },
      { stat: "LUK", quantity: 30, finalDamagePercent: 0.12 },
      { stat: "Max HP", quantity: 5000, finalDamagePercent: 0.8 },
      { stat: "Attack%", quantity: 12, finalDamagePercent: 4.827 },
      { stat: "Ignore Def(380)", quantity: 40, finalDamagePercent: 1.361 },
      { stat: "Attack", quantity: 30, finalDamagePercent: 0.606 },
    ]);
  });

  it("uses the legacy fuzzy catalog threshold", () => {
    expect(findBestCatalogFacts(catalog, "S0urce of Sufferlng", "PENDANT", 160)?.name).toBe("Source of Suffering");
    expect(normalizeCatalogSlot("RING_4")).toBe("RING");
    expect(normalizeCatalogSlot("PENDANT_2")).toBe("PENDANT");
  });
});
