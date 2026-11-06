import { describe, expect, it } from "vitest";
import { DEFAULT_STAR_FORCE_SETTINGS } from "./star-force-settings";
import type { EquipmentItem } from "./equipment-manager";
import { buildRecommendations, mainStatForJob } from "./upgrade-recommendations";

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
});
