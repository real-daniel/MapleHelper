import { describe, expect, it } from "vitest";
import { equipmentTooltipStatRows, starForceRows } from "./equipment-tooltip-stats";

describe("equipment tooltip stats", () => {
  it("combines catalog, Star Force, and flame stats into in-game totals", () => {
    const rows = equipmentTooltipStatRows({
      slot: "BOTTOM",
      levelRequirement: 250,
      starForce: 24,
      statLines: "",
      flameStats: "STR: +123\nDEX: +35\nINT: +28\nAll Stat: +5%",
      catalogBaseStats: { STR: 50, DEX: 50, "Attack Power": 6, Defense: 325 },
      catalogStarForceProfile: "ARMOR_ACCESSORY",
    });
    expect(rows.find((row) => row.key === "STR")).toMatchObject({ total: 332, components: [
      { kind: "base", value: 50 }, { kind: "starForce", value: 159 }, { kind: "flame", value: 123 },
    ] });
    expect(rows.find((row) => row.key === "DEX")?.total).toBe(244);
    expect(rows.find((row) => row.key === "INT")?.total).toBe(28);
    expect(rows.find((row) => row.key === "ALL_STATS")).toMatchObject({ total: 5, percent: true });
    expect(rows.find((row) => row.key === "ATTACK_POWER")?.total).toBe(174);
    expect(rows.find((row) => row.key === "MAX_HP")?.total).toBe(255);
  });

  it("uses an OCR-displayed total and identifies unmodeled upgrade stats", () => {
    const rows = equipmentTooltipStatRows({
      slot: "HAT", levelRequirement: 200, starForce: 0, flameStats: "STR: +20", statLines: "STR +90 (50 +20 +20)",
      catalogBaseStats: { STR: 50 }, catalogStarForceProfile: "ARMOR_ACCESSORY",
    });
    expect(rows[0]).toMatchObject({ total: 90, components: [
      { kind: "base", value: 50 }, { kind: "flame", value: 20 }, { kind: "other", value: 20 },
    ] });
  });

  it("groups stars in sets of five and rows of fifteen", () => {
    const rows = starForceRows(22, 25);
    expect(rows.map((row) => row.map((group) => group.length))).toEqual([[5, 5, 5], [5, 5]]);
    expect(rows.flat(2).filter(Boolean)).toHaveLength(22);
  });
});
