import { describe, expect, it } from "vitest";
import { potentialLineOptions, supportsPotential } from "./potential-lines";

describe("equipment potential lines", () => {
  it("offers useful weapon outcomes for the selected tier and line", () => {
    const options = potentialLineOptions("WEAPON", "Legendary", 0, 150);
    expect(options).toContain("Attack Power +12%");
    expect(options).toContain("Boss Damage +40%");
    expect(options).toContain("Ignore Enemy Defense +40%");
  });

  it("uses the higher GMS percentage band at level 160 and above", () => {
    const options = potentialLineOptions("WEAPON", "Legendary", 0, 160);
    expect(options).toContain("Attack Power +13%");
    expect(options).toContain("STR +13%");
    expect(options).toContain("All Stats +10%");
    expect(options).toContain("Boss Damage +40%");
    expect(options).toContain("Ignore Enemy Defense +40%");
    expect(options).not.toContain("Attack Power +12%");
  });

  it("filters useful stat and attack lines using the character class", () => {
    const adele = potentialLineOptions("WEAPON", "Legendary", 0, 200, "Adele");
    expect(adele).toContain("STR +13%");
    expect(adele).toContain("Attack Power +13%");
    expect(adele).not.toContain("INT +13%");
    expect(adele).not.toContain("Magic Attack +13%");

    const bishop = potentialLineOptions("WEAPON", "Legendary", 0, 200, "Bishop");
    expect(bishop).toContain("INT +13%");
    expect(bishop).toContain("Magic Attack +13%");
    expect(bishop).not.toContain("Attack Power +13%");
  });

  it("handles Demon Avenger and Xenon stat semantics", () => {
    expect(potentialLineOptions("TOP", "Legendary", 0, 160, "Demon Avenger")).toEqual(expect.arrayContaining(["Max HP +13%"]));
    const xenon = potentialLineOptions("TOP", "Legendary", 0, 160, "Xenon");
    expect(xenon).toEqual(expect.arrayContaining(["STR +13%", "DEX +13%", "LUK +13%", "All Stats +10%"]));
    expect(xenon).not.toContain("INT +13%");
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
