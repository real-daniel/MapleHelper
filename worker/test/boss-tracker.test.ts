import { describe, expect, it } from "vitest";
import { formatMeso, personalCrystalIncome } from "../../frontend/src/components/boss-tracker-data";

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
