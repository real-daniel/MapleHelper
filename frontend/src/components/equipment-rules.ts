import type { EquipmentSlot } from "./equipment-manager";

export type AstraStage = 1 | 2 | 3;

export const BLACK_HEART_STAR_FORCE = 15;
export const BLACK_HEART_POTENTIAL_TIER = "Epic";
export const BLACK_HEART_POTENTIAL_LINES = "Boss Damage +30%\nIgnore Enemy Defense +30%";
export const BLACK_HEART_BASE_STATS = {
  STR: 50, DEX: 50, INT: 50, LUK: 50, "Max HP": 100, "Attack Power": 77, "Magic Attack": 77,
};

const NO_FLAME_SLOTS = new Set<EquipmentSlot>([
  "SECONDARY", "EMBLEM", "BADGE", "RING", "ANDROID", "HEART", "TOTEM",
]);

const POTENTIAL_BADGE_EXCEPTIONS = new Set([
  "ghost ship exorcist", "sengoku hakase badge", "shackles of resentment",
]);

const SPECIAL_RING_PATTERNS = [
  /ring of restraint/i, /weapon jump .* ring/i, /risk taker ring/i, /continuous ring/i,
  /level jump .* ring/i, /critical damage ring/i, /totalling ring/i, /overdrive ring/i,
];

export function isAstraSecondary(slot: EquipmentSlot, name: string) {
  return slot === "SECONDARY" && /^astra\b/i.test(name.trim());
}

export function isBlackHeart(slot: EquipmentSlot, name: string) {
  return slot === "HEART" && name.trim().toLowerCase() === "black heart";
}

export function astraStarForceCap(name: string, stage: AstraStage | null, jobName?: string) {
  if (/astra (katara|talisman)/i.test(name) || /dual blade|kanna/i.test(jobName ?? "")) return 30;
  return stage === 3 ? 30 : stage === 2 ? 20 : 15;
}

export function astraBaseStatsForStage(
  name: string,
  baseStats: Record<string, number> | null,
  stage: AstraStage | null,
) {
  if (!baseStats || !stage || stage === 1) return baseStats;
  const result = { ...baseStats };
  const normalized = name.trim().toLowerCase();
  for (const stat of ["STR", "DEX", "INT", "LUK"]) {
    if (result[stat] == null) continue;
    if (normalized === "astra deca core controller") {
      result[stat] = stage === 2 ? 7 : 10;
    } else {
      const perPhase = /astra (katara|talisman)/i.test(name) ? 10 : 5;
      result[stat] += perPhase * (stage - 1);
    }
  }
  return result;
}

export function supportsFlames(slot: EquipmentSlot, name: string) {
  const normalized = name.trim().toLowerCase();
  if (slot === "MEDAL") return normalized === "immortal legacy";
  if (slot === "SHOULDER") return normalized === "scarlet shoulder";
  if (slot === "TOTEM") return normalized === "ancient slate replica";
  return !NO_FLAME_SLOTS.has(slot);
}

export function supportsItemPotential(slot: EquipmentSlot, name: string) {
  const normalized = name.trim().toLowerCase();
  if (["POCKET", "MEDAL", "ANDROID", "TOTEM"].includes(slot)) return false;
  if (slot === "BADGE") return POTENTIAL_BADGE_EXCEPTIONS.has(normalized);
  if (slot === "RING" && SPECIAL_RING_PATTERNS.some((pattern) => pattern.test(name))) return false;
  return true;
}

export function standardStarForceCap(level: number | null) {
  if (level == null) return 30;
  if (level <= 94) return 5;
  if (level <= 107) return 8;
  if (level <= 117) return 10;
  if (level <= 127) return 15;
  if (level <= 137) return 20;
  return 30;
}

export function itemStarForceCap(
  slot: EquipmentSlot,
  name: string,
  level: number | null,
  starForceProfile: string | null | undefined,
  astraStage: AstraStage | null,
  jobName?: string,
) {
  if (isAstraSecondary(slot, name)) return astraStarForceCap(name, astraStage, jobName);
  if (isBlackHeart(slot, name)) return BLACK_HEART_STAR_FORCE;
  if (slot === "HEART") return standardStarForceCap(level);
  if (slot === "WEAPON" && /^genesis\b/i.test(name.trim())) return 22;
  if (slot === "WEAPON" && /^destiny\b/i.test(name.trim())) return 25;
  if (slot === "BADGE" && POTENTIAL_BADGE_EXCEPTIONS.has(name.trim().toLowerCase())) return 22;
  if (starForceProfile === "NONE") return 0;
  if (["EMBLEM", "POCKET", "BADGE", "MEDAL", "ANDROID", "TOTEM"].includes(slot)) return 0;
  return standardStarForceCap(level);
}
