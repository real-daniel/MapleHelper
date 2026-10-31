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
  BADGE: "heart",
};

const OFFENSIVE_USEFUL = new Set(["ATT %", "MATT %", "Damage %", "Ignore Enemy Defense %", "Boss Damage"]);
const LEVEL_160_SCALING = new Set([
  "STR %", "DEX %", "INT %", "LUK %", "Max HP %", "All Stats %", "ATT %", "MATT %", "Damage %",
]);

export function supportsPotential(slot: EquipmentSlot) {
  return slot in SLOT_CATEGORY;
}

export function potentialLineOptions(slot: EquipmentSlot, tierName: string, lineIndex: number, levelRequirement?: number | null, jobName?: string) {
  const category = SLOT_CATEGORY[slot];
  const tier = tierName.toLowerCase() as PotentialTier;
  const line = (["first_line", "second_line", "third_line"] as PotentialLine[])[lineIndex];
  if (!category || !line || !["rare", "epic", "unique", "legendary"].includes(tier)) return [];

  const outcomes = cubeRates.lvl120to200?.[category]?.red?.[tier]?.[line] as Array<[string, unknown, number]> | undefined;
  if (!outcomes) return [];

  const profile = usefulPotentialProfile(jobName);
  const usefulNames = new Set(profile.stats);
  if (["weapon", "secondary", "emblem"].includes(category)) {
    for (const name of OFFENSIVE_USEFUL) usefulNames.add(name);
    if (profile.attack) {
      usefulNames.delete("ATT %");
      usefulNames.delete("MATT %");
      usefulNames.add(profile.attack);
    }
  }
  if (category === "gloves") usefulNames.add("Critical Damage %");
  if (category === "hat") usefulNames.add("Skill Cooldown Reduction");
  if (category === "ring") {
    usefulNames.add("Meso Amount %");
    usefulNames.add("Item Drop Rate %");
  }

  const options = outcomes.flatMap(([name, value]) => {
    if (!usefulNames.has(name) || typeof value !== "number") return [];
    const scaledValue = levelRequirement != null && levelRequirement >= 160 && LEVEL_160_SCALING.has(name) ? value + 1 : value;
    return [formatPotentialLine(name, scaledValue)];
  });
  return [...new Set(options)];
}

function usefulPotentialProfile(jobName?: string) {
  const job = jobName?.trim().toLowerCase() ?? "";
  if (!job) return { stats: ["STR %", "DEX %", "INT %", "LUK %", "Max HP %", "All Stats %"], attack: null };
  if (job.includes("demon avenger")) return { stats: ["Max HP %"], attack: "ATT %" };
  if (job.includes("xenon")) return { stats: ["STR %", "DEX %", "LUK %", "All Stats %"], attack: "ATT %" };

  const magicJobs = [
    "arch mage", "bishop", "blaze wizard", "battle mage", "evan", "luminous", "kinesis",
    "illium", "lara", "kanna", "lynn", "beast tamer", "sia astelle", "erel light",
  ];
  if (magicJobs.some((name) => job.includes(name))) return { stats: ["INT %", "All Stats %"], attack: "MATT %" };

  const dexJobs = [
    "bowmaster", "marksman", "pathfinder", "wind archer", "wild hunter", "mercedes", "kain",
    "angelic buster", "mechanic", "corsair", "captain", "mo xuan", "jett",
  ];
  if (dexJobs.some((name) => job.includes(name))) return { stats: ["DEX %", "All Stats %"], attack: "ATT %" };

  const lukJobs = [
    "night lord", "shadower", "dual blade", "night walker", "phantom", "cadena", "khali", "hoyoung",
  ];
  if (lukJobs.some((name) => job.includes(name))) return { stats: ["LUK %", "All Stats %"], attack: "ATT %" };

  const strJobs = [
    "hero", "paladin", "dark knight", "dawn warrior", "mihile", "aran", "demon slayer", "blaster",
    "kaiser", "adele", "zero", "buccaneer", "cannoneer", "thunder breaker", "shade", "ark", "hayato", "ren",
  ];
  if (strJobs.some((name) => job.includes(name))) return { stats: ["STR %", "All Stats %"], attack: "ATT %" };

  return { stats: ["STR %", "DEX %", "INT %", "LUK %", "Max HP %", "All Stats %"], attack: null };
}

function formatPotentialLine(name: string, value: number) {
  if (name === "Skill Cooldown Reduction") return `Skill Cooldown -${value} sec`;
  const cleanName = name === "ATT %" ? "Attack Power"
    : name === "MATT %" ? "Magic Attack"
      : name === "Boss Damage" ? name
        : name.replace(/ %$/, "");
  return `${cleanName} +${value}%`;
}
