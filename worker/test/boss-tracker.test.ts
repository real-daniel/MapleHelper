import { describe, expect, it } from "vitest";
import { formatMeso, personalCrystalIncome } from "../../frontend/src/components/boss-tracker-data";
import { accountBossIncome, characterBossIncome, countedWeeklyBosses, type BossPlanEntry } from "../../shared/boss-income";
import { parsePresetEntries } from "../src/boss-tracker";

function boss(index: number, overrides: Partial<BossPlanEntry> = {}): BossPlanEntry {
  return { bossKey: `boss-${index}`, bossName: `Boss ${index}`, difficulty: "Normal", resetPeriod: "WEEKLY",
    crystalValue: index * 100, partySize: 1, tracked: true, cleared: false, ...overrides };
}

describe("boss income calculations", () => {
  it("splits a crystal evenly and floors partial mesos", () => {
    expect(personalCrystalIncome(100, 3)).toBe(33);
    expect(personalCrystalIncome(4_500_000_000, 6)).toBe(750_000_000);
  });

  it("bounds invalid party sizes", () => {
    expect(personalCrystalIncome(600, 0)).toBe(600);
    expect(personalCrystalIncome(600, 99)).toBe(100);
  });

  it("formats calculator totals for scanning", () => {
    expect(formatMeso(81_000_000)).toBe("81.0m");
    expect(formatMeso(4_500_000_000)).toBe("4.50b");
  });
});

describe("weekly crystal limits", () => {
  it("keeps all selections but counts the highest 14 personal payouts", () => {
    const rows = Array.from({ length: 15 }, (_, index) => boss(index + 1));
    rows.push(boss(99, { crystalValue: 6_000, partySize: 6 }));
    const totals = characterBossIncome(rows);
    expect(totals.planned).toBe(16);
    expect(totals.plannedCrystals).toBe(14);
    expect(totals.weeklyPlan).toBe(12_700);
    expect(countedWeeklyBosses(rows).some((row) => row.bossKey === "boss-1")).toBe(false);
    expect(rows).toHaveLength(16);
  });

  it("earns from the highest cleared bosses even if higher planned bosses are uncleared", () => {
    const rows = Array.from({ length: 15 }, (_, index) => boss(index + 1, { cleared: index < 14 }));
    const totals = characterBossIncome(rows);
    expect(totals.weeklyPlan).toBe(11_900);
    expect(totals.weeklyCleared).toBe(10_500);
    expect(totals.clearedCrystals).toBe(14);
  });

  it("caps cleared income, ignores unselected bosses, and keeps monthly income separate", () => {
    const rows = Array.from({ length: 15 }, (_, index) => boss(index + 1, { cleared: true }));
    rows.push(boss(100, { tracked: false, cleared: true }));
    rows.push(boss(101, { resetPeriod: "MONTHLY", crystalValue: 4_500, partySize: 3, cleared: true }));
    const totals = characterBossIncome(rows);
    expect(totals.weeklyCleared).toBe(11_900);
    expect(totals.clearedCrystals).toBe(14);
    expect(totals.monthlyPlan).toBe(1_500);
    expect(totals.monthlyCleared).toBe(1_500);
    expect(totals.monthlyProjection).toBe(11_900 * 4.345 + 1_500);
  });

  it("applies each character's cap before counting the account's highest 180", () => {
    const rows = Array.from({ length: 13 }, (_, characterProfileId) =>
      Array.from({ length: 15 }, (_, index) => ({ ...boss(index + 1, { cleared: true }), characterProfileId }))).flat();
    const totals = accountBossIncome(rows);
    expect(totals.selectedWeekly).toBe(195);
    expect(totals.plannedCrystals).toBe(180);
    expect(totals.clearedCrystals).toBe(180);
    expect(totals.weeklyPlan).toBe(13 * 11_900 - 2 * 200);
    expect(totals.weeklyCleared).toBe(totals.weeklyPlan);
  });

  it("handles empty plans and never borrows unused slots from another character", () => {
    expect(accountBossIncome([]).weeklyPlan).toBe(0);
    expect(characterBossIncome([]).plannedCrystals).toBe(0);
    const rows = Array.from({ length: 20 }, (_, index) => ({ ...boss(index + 1), characterProfileId: 1 }));
    expect(accountBossIncome(rows).plannedCrystals).toBe(14);
  });
});

describe("boss presets", () => {
  it("saves settings without copying clears", () => {
    const rows = parsePresetEntries([boss(1, { cleared: true, partySize: 3 })]);
    expect(rows[0]).toEqual(boss(1, { partySize: 3 }));
  });

  it("rejects empty, oversized, duplicate, or invalid presets", () => {
    expect(() => parsePresetEntries([])).toThrow();
    expect(() => parsePresetEntries(Array.from({ length: 101 }, (_, index) => boss(index)))).toThrow();
    expect(() => parsePresetEntries([boss(1), boss(1)])).toThrow("duplicate");
    expect(() => parsePresetEntries([boss(1, { partySize: 7 })])).toThrow("partySize");
    expect(() => parsePresetEntries([boss(1, { crystalValue: -1 })])).toThrow("crystalValue");
  });
});
