import { EQUIPMENT_SLOTS, type EquipmentSlot } from "../types";

export const EQUIPMENT_STATS = [
  "STR", "DEX", "INT", "LUK", "ALL_STATS", "MAX_HP", "MAX_MP", "ATTACK_POWER",
  "MAGIC_ATTACK", "DEFENSE", "SPEED", "JUMP", "BOSS_DAMAGE", "DAMAGE",
  "ENEMY_DEFENSE_IGNORED",
] as const;

export type EquipmentStat = typeof EQUIPMENT_STATS[number];
export type StarForceProfile = "ARMOR_ACCESSORY" | "WEAPON" | "SUPERIOR" | "BADGE" | "NORMAL" | "NONE";

export interface CatalogEquipmentFacts {
  name: string;
  slot: EquipmentSlot;
  levelRequirement: number | null;
  starForceProfile: StarForceProfile;
  baseStats: Partial<Record<EquipmentStat, number>>;
}

export interface ParsedEquipmentStatLine {
  stat: EquipmentStat;
  total: number;
  percent: boolean;
}

export interface ParsedEquipmentText {
  slot: EquipmentSlot | null;
  name: string;
  levelRequirement: number | null;
  starForce: number | null;
  statLines: string;
  flameStats: string;
  potentialTier: string;
  potentialLines: string;
  bonusPotentialTier: string;
  bonusPotentialLines: string;
}

const STAT_LABELS: Record<EquipmentStat, string> = {
  STR: "STR",
  DEX: "DEX",
  INT: "INT",
  LUK: "LUK",
  ALL_STATS: "All Stats",
  MAX_HP: "Max HP",
  MAX_MP: "Max MP",
  ATTACK_POWER: "Attack Power",
  MAGIC_ATTACK: "Magic Attack",
  DEFENSE: "Defense",
  SPEED: "Speed",
  JUMP: "Jump",
  BOSS_DAMAGE: "Boss Damage",
  DAMAGE: "Damage",
  ENEMY_DEFENSE_IGNORED: "Enemy Defense Ignored",
};

export function equipmentStatLabel(stat: EquipmentStat): string {
  return STAT_LABELS[stat];
}

export function equipmentStatFromOcrName(value: string): EquipmentStat | null {
  const normalized = value.toLowerCase()
    .replaceAll("0", "o").replaceAll("1", "i").replaceAll("7", "t")
    .replace(/[^a-z]/g, "");
  const exact: Record<string, EquipmentStat> = {
    str: "STR", dex: "DEX", int: "INT", luk: "LUK",
    allstat: "ALL_STATS", allstats: "ALL_STATS", alstats: "ALL_STATS",
    maxhp: "MAX_HP", machp: "MAX_HP", mach: "MAX_HP",
    maxmp: "MAX_MP", wax: "MAX_MP",
    attackpower: "ATTACK_POWER", attpower: "ATTACK_POWER",
    magicatt: "MAGIC_ATTACK", magicattack: "MAGIC_ATTACK",
    defense: "DEFENSE", speed: "SPEED", jump: "JUMP",
    bossdamage: "BOSS_DAMAGE", damage: "DAMAGE",
    enemydefignored: "ENEMY_DEFENSE_IGNORED", enemydefenseignored: "ENEMY_DEFENSE_IGNORED",
  };
  if (exact[normalized]) return exact[normalized];
  if (normalized.length < 3) return null;

  let best: EquipmentStat | null = null;
  let bestDistance = Number.MAX_SAFE_INTEGER;
  for (const stat of EQUIPMENT_STATS) {
    const candidate = STAT_LABELS[stat].toLowerCase().replace(/[^a-z]/g, "");
    const distance = editDistance(normalized, candidate);
    const allowedDistance = candidate.length <= 4 ? 1 : Math.max(2, Math.floor(candidate.length / 5));
    if (distance <= allowedDistance && distance < bestDistance) {
      best = stat;
      bestDistance = distance;
    }
  }
  return best;
}

export function parseEquipmentStatLines(statLines: string | null | undefined): ParsedEquipmentStatLine[] {
  if (!statLines?.trim()) return [];
  const parsed: ParsedEquipmentStatLine[] = [];
  const pattern = /^\s*([A-Za-z ]+)\s*[:+ ]*([+\-#]?\s*\d{1,5})\s*(%)?.*/i;
  for (const original of statLines.split(/\r?\n/)) {
    const match = original.replaceAll("#", "+").match(pattern);
    if (!match) continue;
    const stat = equipmentStatFromOcrName(match[1]);
    if (!stat) continue;
    parsed.push({ stat, total: Number.parseInt(match[2].replace(/[^\-\d]/g, ""), 10), percent: Boolean(match[3]) });
  }
  return parsed;
}

export async function loadCatalogFacts(db: D1Database): Promise<CatalogEquipmentFacts[]> {
  const rows = await db.prepare(`
    SELECT name, slot, level_requirement, star_force_profile, base_stats
    FROM equipment_catalog_items
    WHERE base_stats IS NOT NULL
  `).all<Record<string, unknown>>();
  return rows.results.flatMap((row) => {
    if (typeof row.name !== "string" || typeof row.slot !== "string") return [];
    const slot = normalizeCatalogSlot(row.slot);
    if (!slot) return [];
    let rawStats: Record<string, unknown> = {};
    try {
      rawStats = typeof row.base_stats === "string" ? JSON.parse(row.base_stats) as Record<string, unknown> : {};
    } catch {
      return [];
    }
    const baseStats: Partial<Record<EquipmentStat, number>> = {};
    for (const [label, value] of Object.entries(rawStats)) {
      const stat = equipmentStatFromOcrName(label);
      if (stat && typeof value === "number" && Number.isFinite(value)) baseStats[stat] = value;
    }
    return [{
      name: row.name,
      slot,
      levelRequirement: typeof row.level_requirement === "number" ? row.level_requirement : null,
      starForceProfile: (typeof row.star_force_profile === "string" ? row.star_force_profile : "ARMOR_ACCESSORY") as StarForceProfile,
      baseStats,
    }];
  });
}

export function normalizeCatalogSlot(value: string): EquipmentSlot | null {
  const normalized = value.replace(/_(?:1|2|3|4)$/, "");
  return EQUIPMENT_SLOTS.includes(normalized as EquipmentSlot) ? normalized as EquipmentSlot : null;
}

export function findBestCatalogFacts(
  facts: readonly CatalogEquipmentFacts[],
  name: string | null | undefined,
  slot: EquipmentSlot | null,
  levelRequirement: number | null,
): CatalogEquipmentFacts | null {
  if (!name?.trim()) return null;
  const normalizedName = normalizeCatalogName(name);
  let best: CatalogEquipmentFacts | null = null;
  let bestScore = -1;
  for (const candidate of facts) {
    if (slot && candidate.slot !== slot) continue;
    if (levelRequirement != null && candidate.levelRequirement != null && Math.abs(candidate.levelRequirement - levelRequirement) > 10) continue;
    const score = catalogMatchScore(normalizedName, candidate.name);
    if (score >= 45 && score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

function catalogMatchScore(normalizedName: string, catalogName: string): number {
  const normalizedCatalogName = normalizeCatalogName(catalogName);
  if (normalizedName === normalizedCatalogName) return 100;
  if (normalizedName.includes(normalizedCatalogName) || normalizedCatalogName.includes(normalizedName)) return 80;
  const compactName = normalizedName.replaceAll(" ", "");
  const compactCatalog = normalizedCatalogName.replaceAll(" ", "");
  const longest = Math.max(compactName.length, compactCatalog.length);
  return longest === 0 ? 0 : Math.round(100 * (longest - editDistance(compactName, compactCatalog)) / longest);
}

function normalizeCatalogName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function editDistance(left: string, right: string): number {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const substitution = previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
      current[rightIndex] = Math.min(current[rightIndex - 1] + 1, previous[rightIndex] + 1, substitution);
    }
    previous = current;
  }
  return previous[right.length];
}

const SKILL_RING_NAMES = [
  "ring of restraint", "continuous ring", "weapon jump s ring", "weapon jump i ring", "weapon jump l ring",
  "weapon jump d ring", "risk taker ring", "totalling ring", "critical damage ring", "ultimatum ring",
  "crisis hm ring", "cleansing ring", "overdrive ring", "level jump s ring", "level jump d ring",
  "level jump i ring", "level jump l ring", "health cut ring", "critical defense ring", "limit ring",
  "durability ring", "clean defense ring", "berserker ring", "mana cut ring", "crisis h ring", "crisis m ring",
  "critical shift ring", "stance shift ring", "clean stance ring", "swift ring", "reflective ring",
  "tower boost ring", "modestly grand ribbit ring", "rather grand ribbit ring", "quite grand ribbit ring",
  "very grand ribbit ring", "modestly sturdy krrr ring", "rather sturdy krrr ring", "quite sturdy krrr ring",
  "very sturdy krrr ring", "modestly fatal rawr ring", "rather fatal rawr ring", "quite fatal rawr ring",
  "very fatal rawr ring", "modestly grand pew pew ring", "rather grand pew pew ring", "quite grand pew pew ring",
  "very grand pew pew ring",
] as const;

function normalizeSkillRing(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function isSkillRing(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const normalized = normalizeSkillRing(value);
  return normalized.includes("special skill ring")
    || SKILL_RING_NAMES.some((name) => normalized.includes(name))
    || /\bweapon jump [sild] ring\b/.test(normalized)
    || /\blevel jump [sild] ring\b/.test(normalized)
    || /\bcrisis (hm|h|m) ring\b/.test(normalized);
}

export function findSkillRingName(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const normalized = normalizeSkillRing(value);
  const match = SKILL_RING_NAMES.find((name) => normalized.includes(name));
  return match ? titleCaseSkillRing(match) : null;
}

function titleCaseSkillRing(value: string): string {
  return value.split(" ").map((word) => {
    if (word === "of" || word === "and") return word;
    return word.length === 1 ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1);
  }).join(" ");
}
