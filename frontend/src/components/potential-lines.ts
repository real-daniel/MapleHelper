import { cubeRates } from "./cube-rates";
import type { EquipmentSlot } from "./equipment-manager";

type PotentialTier = "rare" | "epic" | "unique" | "legendary";
type PotentialLine = "first_line" | "second_line" | "third_line";

const SLOT_CATEGORY: Partial<Record<EquipmentSlot, string>> = {
  RING: "ring",
  PENDANT: "ring",
  FACE: "ring",
  EYE: "ring",
  EARRINGS: "ring",
  WEAPON: "weapon",
  SECONDARY: "secondary",
  EMBLEM: "emblem",
  HAT: "hat",
  TOP: "top",
  BOTTOM: "bottom",
  SHOES: "shoes",
  GLOVES: "gloves",
  CAPE: "cape",
  BELT: "belt",
  SHOULDER: "shoulder",
  HEART: "heart",
};

const COMMON_USEFUL = new Set(["STR %", "DEX %", "INT %", "LUK %", "Max HP %", "All Stats %"]);
const OFFENSIVE_USEFUL = new Set(["ATT %", "MATT %", "Damage %", "Ignore Enemy Defense %", "Boss Damage"]);

export function supportsPotential(slot: EquipmentSlot) {
  return slot in SLOT_CATEGORY;
}

export function potentialLineOptions(slot: EquipmentSlot, tierName: string, lineIndex: number) {
  const category = SLOT_CATEGORY[slot];
  const tier = tierName.toLowerCase() as PotentialTier;
  const line = (["first_line", "second_line", "third_line"] as PotentialLine[])[lineIndex];
  if (!category || !line || !["rare", "epic", "unique", "legendary"].includes(tier)) return [];

  const outcomes = cubeRates.lvl120to200?.[category]?.red?.[tier]?.[line] as Array<[string, unknown, number]> | undefined;
  if (!outcomes) return [];

  const usefulNames = new Set(COMMON_USEFUL);
  if (["weapon", "secondary", "emblem"].includes(category)) for (const name of OFFENSIVE_USEFUL) usefulNames.add(name);
  if (category === "gloves") usefulNames.add("Critical Damage %");
  if (category === "hat") usefulNames.add("Skill Cooldown Reduction");
  if (category === "ring") {
    usefulNames.add("Meso Amount %");
    usefulNames.add("Item Drop Rate %");
  }

  const options = outcomes.flatMap(([name, value]) => {
    if (!usefulNames.has(name) || typeof value !== "number") return [];
    return [formatPotentialLine(name, value)];
  });
  return [...new Set(options)];
}

function formatPotentialLine(name: string, value: number) {
  if (name === "Skill Cooldown Reduction") return `Skill Cooldown -${value} sec`;
  const cleanName = name === "ATT %" ? "Attack Power"
    : name === "MATT %" ? "Magic Attack"
      : name === "Boss Damage" ? name
        : name.replace(/ %$/, "");
  return `${cleanName} +${value}%`;
}
