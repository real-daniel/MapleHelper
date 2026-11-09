import { describe, expect, it } from "vitest";
import { classStatProfile } from "./class-stat-profiles";

const EXPECTED = {
  STR_DEX: ["Hero", "Paladin", "Dark Knight", "Dawn Warrior", "Mihile", "Aran", "Demon Slayer", "Blaster", "Kaiser", "Adele", "Zero", "Hayato", "Ren", "Erel Light", "Buccaneer", "Cannon Master", "Thunder Breaker", "Shade", "Ark"],
  INT_LUK: ["Arch Mage (F/P)", "Arch Mage (I/L)", "Bishop", "Blaze Wizard", "Battle Mage", "Evan", "Luminous", "Kinesis", "Illium", "Lara", "Kanna", "Lynn", "Sia Astelle"],
  DEX_STR: ["Bow Master", "Marksman", "Pathfinder", "Wind Archer", "Wild Hunter", "Mercedes", "Kain", "Corsair", "Mechanic", "Mo Xuan", "Angelic Buster"],
  LUK_DEX: ["Night Lord", "Night Walker", "Phantom", "Khali", "Hoyoung"],
} as const;

describe("class stat profiles", () => {
  it.each(EXPECTED.STR_DEX)("maps %s to STR / DEX", (job) => expect(classStatProfile(job)).toMatchObject({ primaryStats: ["STR"], secondaryStats: ["DEX"], attackStat: "Attack" }));
  it.each(EXPECTED.INT_LUK)("maps %s to INT / LUK", (job) => expect(classStatProfile(job)).toMatchObject({ primaryStats: ["INT"], secondaryStats: ["LUK"], attackStat: "Magic Attack" }));
  it.each(EXPECTED.DEX_STR)("maps %s to DEX / STR", (job) => expect(classStatProfile(job)).toMatchObject({ primaryStats: ["DEX"], secondaryStats: ["STR"], attackStat: "Attack" }));
  it.each(EXPECTED.LUK_DEX)("maps %s to LUK / DEX", (job) => expect(classStatProfile(job)).toMatchObject({ primaryStats: ["LUK"], secondaryStats: ["DEX"], attackStat: "Attack" }));

  it.each(["Shadower", "Blade Master", "Dual Blade", "Cadena"])("keeps both %s secondary stats distinct", (job) => {
    expect(classStatProfile(job)).toMatchObject({ primaryStats: ["LUK"], secondaryStats: ["DEX", "STR"] });
  });

  it("handles Demon Avenger and Xenon explicitly", () => {
    expect(classStatProfile("Demon Avenger")).toMatchObject({ primaryStats: ["Max HP"], secondaryStats: ["STR"], usesAllStatPotential: false });
    expect(classStatProfile("Xenon")).toMatchObject({ primaryStats: ["STR", "DEX", "LUK"], secondaryStats: [], usesAllStatPotential: true });
  });
});
