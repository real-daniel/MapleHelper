import { describe, expect, it } from "vitest";
import { analyzeMesoFlame, MESO_FLAME_RESET_COST, mesoFlameChanceAtLeast, mesoFlameScoreDistribution, type MesoFlameInput } from "./flame";

const input: MesoFlameInput = {
  level: 200,
  equipmentKind: "armor",
  flameAdvantaged: true,
  baseAttack: 0,
  magicAttack: false,
  weights: { stats: {}, allStat: 1, attack: 0, bossDamage: 0, damage: 0 },
};

describe("GMS v271 meso flame model", () => {
  it("produces a normalized score distribution", () => {
    const total = [...mesoFlameScoreDistribution(input).values()].reduce((sum, probability) => sum + probability, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("uses Black Flame tier rates and four guaranteed lines on advantaged equipment", () => {
    expect(mesoFlameChanceAtLeast(input, 7)).toBeCloseTo(4 / 19 * 0.01, 10);
  });

  it("uses variable line counts on ordinary equipment", () => {
    const normal = { ...input, flameAdvantaged: false };
    const expectedSelectedLines = 1 * 0.375 + 2 * 0.375 + 3 * 0.195 + 4 * 0.055;
    expect(mesoFlameChanceAtLeast(normal, 5)).toBeCloseTo(expectedSelectedLines / 19 * 0.01, 10);
  });

  it("prices keep-or-replace resets at three million mesos", () => {
    const analysis = analyzeMesoFlame(input, 6);
    expect(analysis.betterChance).toBeGreaterThan(0);
    expect(analysis.expectedCost).toBeCloseTo(analysis.expectedResets * MESO_FLAME_RESET_COST, 5);
    expect(analysis.expectedGain).toBeGreaterThan(0);
  });
});
