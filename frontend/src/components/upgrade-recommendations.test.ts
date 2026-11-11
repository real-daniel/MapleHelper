import { describe, expect, it } from "vitest";
import { DEFAULT_STAR_FORCE_SETTINGS } from "./star-force-settings";
import type { EquipmentItem } from "./equipment-manager";
import { buildRecommendations, mainStatForJob, potentialDamageForJob, recommendationsForCategory } from "./upgrade-recommendations";

const equivalencies = new Map([
  ["STR", 0.01], ["DEX", 0.01], ["INT", 0.01], ["LUK", 0.01],
  ["Attack", 0.1], ["STR%", 0.1], ["Attack%", 0.4], ["Boss Damage", 0.1], ["IED", 0.05], ["Critical Dmg", 0.3],
]);

function item(overrides: Partial<EquipmentItem>): EquipmentItem {
  return {
    id: 1,
    characterProfileId: 1,
    catalogItemId: 1,
    presetNumber: 1,
    slot: "HAT",
    slotIndex: null,
    name: "Test Hat",
    levelRequirement: 200,
    starForce: 22,
    astraStage: null,
    destinyStage: null,
    statLines: "",
    flameStats: "",
    flameScoreLines: "",
    potentialTier: "Legendary",
    potentialLines: "STR +13%\nSTR +10%\nSTR +10%",
    bonusPotentialTier: "",
    bonusPotentialLines: "",
    rawExtractedText: "",
    catalogBaseStats: { STR: 40, DEX: 40, "Attack Power": 5, Defense: 300 },
    catalogStarForceProfile: "ARMOR_ACCESSORY",
    catalogSetName: null,
    catalogMapleItemId: null,
    createdAt: "now",
    updatedAt: "now",
    ...overrides,
  };
}

describe("preliminary upgrade recommendations", () => {
  it("derives the usual main stat from the character job", () => {
    expect(mainStatForJob("Adele")).toBe("STR");
    expect(mainStatForJob("Mercedes")).toBe("DEX");
    expect(mainStatForJob("Bishop")).toBe("INT");
    expect(mainStatForJob("Night Lord")).toBe("LUK");
    expect(mainStatForJob("Angelic Buster")).toBe("DEX");
  });

  it("does not recommend stars beyond fixed Destiny or Genesis values", () => {
    const recommendations = buildRecommendations([item({
      slot: "WEAPON", name: "Destiny Bladecaster", levelRequirement: 250, starForce: 22, destinyStage: 1,
      catalogStarForceProfile: "WEAPON", catalogBaseStats: { STR: 150, DEX: 150, "Attack Power": 900 },
    })], "STR", equivalencies, DEFAULT_STAR_FORCE_SETTINGS, "Adele");
    expect(recommendations.some((recommendation) => recommendation.kind === "Star Force")).toBe(false);
  });

  it("allows phase-three Astra secondaries to receive Star Force recommendations", () => {
    const recommendations = buildRecommendations([item({
      slot: "SECONDARY", name: "Astra Bladebinder", starForce: 20, astraStage: 3,
      catalogStarForceProfile: "NONE", catalogBaseStats: { STR: 10, DEX: 10, "Attack Power": 7 },
    })], "STR", equivalencies, DEFAULT_STAR_FORCE_SETTINGS, "Adele");
    expect(recommendations.some((recommendation) => recommendation.kind === "Star Force" && recommendation.action === "20 star to 21 star")).toBe(true);
  });

  it("does not recommend resetting protected utility or fixed potentials", () => {
    const recommendations = buildRecommendations([
      item({ id: 2, starForce: 30, potentialLines: "Skill Cooldown -2 sec\nSkill Cooldown -2 sec" }),
      item({ id: 3, slot: "HEART", name: "Black Heart", levelRequirement: 120, starForce: 15, catalogStarForceProfile: "NONE", potentialLines: "Boss Damage +30%\nIgnore Enemy Defense +30%" }),
      item({ id: 4, slot: "RING", name: "Ring of Restraint", levelRequirement: 110, starForce: null, catalogStarForceProfile: "NONE", potentialTier: "", potentialLines: "" }),
    ], "STR", equivalencies, DEFAULT_STAR_FORCE_SETTINGS, "Adele");
    expect(recommendations.some((recommendation) => recommendation.kind === "Cubing")).toBe(false);
  });

  it("prices meso flame improvements but excludes non-rerollable Sweetwater flames", () => {
    const recommendations = buildRecommendations([
      item({ id: 5, starForce: 30, catalogSetName: "Eternal", flameStats: "STR: +20" }),
      item({ id: 6, slot: "PENDANT", name: "Sweetwater Pendant", starForce: 30, catalogSetName: "Sweetwater", flameStats: "STR: +70\nAll Stat: +6%" }),
    ], "STR", equivalencies, DEFAULT_STAR_FORCE_SETTINGS, "Adele");
    expect(recommendations.some((recommendation) => recommendation.kind === "Flaming" && recommendation.item.id === 5)).toBe(true);
    expect(recommendations.some((recommendation) => recommendation.kind === "Flaming" && recommendation.item.id === 6)).toBe(false);
  });

  it("filters the ranked plan by upgrade category without changing efficiency order", () => {
    const recommendations = buildRecommendations([
      item({ id: 7, starForce: 20, catalogSetName: "Eternal", flameStats: "STR: +20" }),
    ], "STR", equivalencies, DEFAULT_STAR_FORCE_SETTINGS, "Adele");
    const flames = recommendationsForCategory(recommendations, "Flaming");
    const stars = recommendationsForCategory(recommendations, "Star Force");
    expect(flames.every((recommendation) => recommendation.kind === "Flaming")).toBe(true);
    expect(stars.every((recommendation) => recommendation.kind === "Star Force")).toBe(true);
    expect(recommendationsForCategory(recommendations, "All")).toEqual(recommendations);
  });

  it("adds each class-specific stat weight independently to Star Force FD", () => {
    const weights = new Map(equivalencies);
    weights.set("LUK", 0.01);
    weights.set("DEX", 0.02);
    weights.set("STR", 0.04);
    const dualBlade = buildRecommendations([item({ id: 8, starForce: 20 })], "LUK", weights, DEFAULT_STAR_FORCE_SETTINGS, "Dual Blade")
      .find((recommendation) => recommendation.kind === "Star Force");
    const nightLord = buildRecommendations([item({ id: 9, starForce: 20 })], "LUK", weights, DEFAULT_STAR_FORCE_SETTINGS, "Night Lord")
      .find((recommendation) => recommendation.kind === "Star Force");
    expect(dualBlade?.notes).toContain("STR");
    expect(dualBlade!.damageGain).toBeGreaterThan(nightLord!.damageGain);
  });

  it("values flat and percentage potential lines on every equipment category", () => {
    const weights = new Map([
      ["LUK", 0.01], ["DEX", 0.02], ["STR", 0.04], ["Attack", 0.1],
      ["LUK%", 0.2], ["DEX%", 0.3], ["STR%", 0.4], ["All Stat%", 0.8], ["Attack%", 1],
    ]);
    const lines = "LUK +12%\nDEX +10%\nSTR +7%\nAll Stats +6%\nAttack Power +12";
    const expected = 12 * 0.2 + 10 * 0.3 + 7 * 0.4 + 6 * 0.8 + 12 * 0.1;
    expect(potentialDamageForJob(lines, "Dual Blade", weights)).toBeCloseTo(expected);
  });

  it("does not treat flat All Stats as Max HP for Demon Avenger", () => {
    const weights = new Map([["Max HP", 0.5], ["STR", 0.01], ["All Stat%", 0.2]]);
    expect(potentialDamageForJob("All Stats +10", "Demon Avenger", weights)).toBeCloseTo(0.1);
    expect(potentialDamageForJob("All Stats +10%", "Demon Avenger", weights)).toBeCloseTo(2);
  });

  it("targets the next real main-stat line mix instead of jumping straight to triple prime", () => {
    const weights = new Map(equivalencies);
    weights.set("STR%", 0.1);
    weights.set("All Stat%", 0.11);
    const recommendation = buildRecommendations([
      item({ id: 10, starForce: 30, potentialLines: "STR +13%\nSTR +10%\nSTR +10%" }),
    ], "STR", weights, DEFAULT_STAR_FORCE_SETTINGS, "Adele")
      .find((candidate) => candidate.kind === "Cubing");
    expect(recommendation?.action).toContain("2 prime + 1 non-prime (36% STR)");
    expect(recommendation?.notes).toContain("2 prime line(s), 1 non-prime line(s)");
  });

  it("compares mixed main-stat and All Stat current lines by total FD", () => {
    const weights = new Map(equivalencies);
    weights.set("STR%", 0.1);
    weights.set("All Stat%", 0.11);
    const recommendation = buildRecommendations([
      item({ id: 11, starForce: 30, potentialLines: "STR +13%\nAll Stats +7%\nAll Stats +10%" }),
    ], "STR", weights, DEFAULT_STAR_FORCE_SETTINGS, "Adele")
      .find((candidate) => candidate.kind === "Cubing");
    expect(recommendation?.action).toContain("1 prime + 2 non-prime (33% STR)");
  });

  it("only generates All Stat cubing targets for Xenon", () => {
    const weights = new Map(equivalencies);
    weights.set("STR%", 0.1);
    weights.set("DEX%", 0.1);
    weights.set("LUK%", 0.1);
    weights.set("All Stat%", 0.5);
    const adele = buildRecommendations([
      item({ id: 12, starForce: 30, potentialLines: "STR +13%\nSTR +10%\nSTR +10%" }),
    ], "STR", weights, DEFAULT_STAR_FORCE_SETTINGS, "Adele").find((candidate) => candidate.kind === "Cubing");
    const xenon = buildRecommendations([
      item({ id: 13, starForce: 30, potentialLines: "STR +13%\nSTR +10%\nSTR +10%" }),
    ], "STR", weights, DEFAULT_STAR_FORCE_SETTINGS, "Xenon").find((candidate) => candidate.kind === "Cubing");
    expect(adele?.action).toContain("STR");
    expect(adele?.action).not.toContain("All Stat");
    expect(xenon?.action).toContain("All Stat");
  });

  it("uses MATT cube lines and probabilities for magic classes", () => {
    const weights = new Map(equivalencies);
    weights.set("Attack%", 1);
    weights.set("Boss Damage", 0);
    weights.set("IED (380)", 0);
    const recommendation = buildRecommendations([
      item({ id: 14, slot: "WEAPON", name: "Test Staff", starForce: 30, potentialLines: "Magic ATT +10%", catalogStarForceProfile: "WEAPON" }),
    ], "INT", weights, DEFAULT_STAR_FORCE_SETTINGS, "Bishop").find((candidate) => candidate.kind === "Cubing");
    expect(potentialDamageForJob("Magic ATT +13%", "Bishop", weights)).toBeCloseTo(13);
    expect(recommendation?.action).toContain("MATT");
    expect(recommendation?.notes).toContain("MATT");
  });

  it("includes Damage lines in boss-only offensive targets", () => {
    const weights = new Map(equivalencies);
    weights.set("Attack%", 0);
    weights.set("Boss Damage", 0.2);
    weights.set("IED (380)", 0);
    const recommendation = buildRecommendations([
      item({ id: 15, slot: "EMBLEM", name: "Test Emblem", starForce: 30, potentialLines: "Damage +10%", catalogStarForceProfile: "NONE" }),
    ], "STR", weights, DEFAULT_STAR_FORCE_SETTINGS, "Adele").find((candidate) => candidate.kind === "Cubing");
    expect(recommendation?.action).toContain("Damage");
  });

  it("never recommends an impossible three-non-prime potential", () => {
    const weights = new Map(equivalencies);
    weights.set("STR%", 0.1);
    const recommendation = buildRecommendations([
      item({ id: 16, starForce: 30, potentialLines: "STR +13%" }),
    ], "STR", weights, DEFAULT_STAR_FORCE_SETTINGS, "Adele").find((candidate) => candidate.kind === "Cubing");
    expect(recommendation?.action).not.toContain("3 non-prime");
  });
});
