import { equipmentJobGroup } from "./equipment-names";

export type CharacterDamageStat = "STR" | "DEX" | "INT" | "LUK" | "Max HP";

export type ClassStatProfile = {
  primaryStats: CharacterDamageStat[];
  secondaryStats: CharacterDamageStat[];
  attackStat: "Attack" | "Magic Attack";
};

const STR_DEX: ClassStatProfile = profile(["STR"], ["DEX"]);
const DEX_STR: ClassStatProfile = profile(["DEX"], ["STR"]);
const INT_LUK: ClassStatProfile = profile(["INT"], ["LUK"], "Magic Attack");
const LUK_DEX: ClassStatProfile = profile(["LUK"], ["DEX"]);
const LUK_DEX_STR: ClassStatProfile = profile(["LUK"], ["DEX", "STR"]);
const DEMON_AVENGER: ClassStatProfile = profile(["Max HP"], ["STR"]);
const XENON: ClassStatProfile = profile(["STR", "DEX", "LUK"], []);

const EXACT_PROFILES: Array<[string[], ClassStatProfile]> = [
  [["demon avenger"], DEMON_AVENGER],
  [["xenon"], XENON],
  [["shadower", "blade master", "dual blade", "cadena"], LUK_DEX_STR],
  [["night lord", "night walker", "phantom", "khali", "hoyoung"], LUK_DEX],
  [["corsair", "captain", "mechanic", "angelic buster", "jett", "mo xuan"], DEX_STR],
];

export function classStatProfile(jobName: string): ClassStatProfile {
  const normalized = jobName.trim().toLowerCase();
  const exact = EXACT_PROFILES.find(([names]) => names.some((name) => normalized.includes(name)));
  if (exact) return exact[1];

  switch (equipmentJobGroup(jobName)) {
    case "Magician": return INT_LUK;
    case "Bowman": return DEX_STR;
    case "Thief": return LUK_DEX;
    case "Pirate": return STR_DEX;
    default: return STR_DEX;
  }
}

function profile(
  primaryStats: CharacterDamageStat[],
  secondaryStats: CharacterDamageStat[],
  attackStat: ClassStatProfile["attackStat"] = "Attack",
): ClassStatProfile {
  return { primaryStats, secondaryStats, attackStat };
}
