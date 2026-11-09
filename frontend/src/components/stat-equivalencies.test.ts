import { describe, expect, it } from "vitest";
import { equivalencyFieldsForJob, equivalencyMap } from "./stat-equivalencies";

describe("character stat equivalencies", () => {
  it("creates separate manual fields for every class-relevant stat", () => {
    expect(equivalencyFieldsForJob("Dual Blade")).toEqual(expect.arrayContaining(["LUK", "LUK%", "DEX", "DEX%", "STR", "STR%"]));
    expect(equivalencyFieldsForJob("Xenon")).toEqual(expect.arrayContaining(["STR", "STR%", "DEX", "DEX%", "LUK", "LUK%"]));
    expect(equivalencyFieldsForJob("Demon Avenger")).toEqual(expect.arrayContaining(["Max HP", "Max HP%", "STR", "STR%"]));
  });

  it("does not collapse unequal secondary-stat FD contributions", () => {
    const values = equivalencyMap([
      { stat: "DEX", quantity: 30, finalDamagePercent: 0.3 },
      { stat: "STR", quantity: 30, finalDamagePercent: 0.15 },
    ]);
    expect(values.get("DEX")).toBeCloseTo(0.01);
    expect(values.get("STR")).toBeCloseTo(0.005);
  });

  it("uses one boss-damage equivalency for Damage and Boss Damage", () => {
    expect(equivalencyFieldsForJob("Adele")).toContain("Boss Damage");
    expect(equivalencyFieldsForJob("Adele")).not.toContain("Damage");
    const values = equivalencyMap([{ stat: "Damage", quantity: 40, finalDamagePercent: 4 }]);
    expect(values.get("Boss Damage")).toBeCloseTo(0.1);
    expect(values.has("Damage")).toBe(false);
  });
});
