import { describe, expect, it } from "vitest";
import { potentialLineOptions, supportsPotential } from "./potential-lines";

describe("equipment potential lines", () => {
  it("offers useful weapon outcomes for the selected tier and line", () => {
    const options = potentialLineOptions("WEAPON", "Legendary", 0);
    expect(options).toContain("Attack Power +12%");
    expect(options).toContain("Boss Damage +40%");
    expect(options).toContain("Ignore Enemy Defense +40%");
  });

  it("excludes boss damage from emblems", () => {
    expect(potentialLineOptions("EMBLEM", "Legendary", 0).some((line) => line.startsWith("Boss Damage"))).toBe(false);
  });

  it("includes slot-specific useful outcomes", () => {
    expect(potentialLineOptions("GLOVES", "Legendary", 0)).toContain("Critical Damage +8%");
    expect(potentialLineOptions("HAT", "Legendary", 0)).toContain("Skill Cooldown -2 sec");
    expect(potentialLineOptions("RING", "Legendary", 0)).toContain("Item Drop Rate +20%");
  });

  it("does not show potential controls for unsupported slots", () => {
    expect(supportsPotential("POCKET")).toBe(false);
    expect(supportsPotential("MEDAL")).toBe(false);
  });
});
