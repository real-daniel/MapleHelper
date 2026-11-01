import { starForceBonuses, type StarForceStat } from "../../../shared/star-force";

export type TooltipStatKey = StarForceStat | "ALL_STATS" | "BOSS_DAMAGE" | "DAMAGE" | "ENEMY_DEFENSE_IGNORED";

export type TooltipStatComponent = {
  kind: "base" | "starForce" | "flame" | "other";
  value: number;
};

export type TooltipStatRow = {
  key: TooltipStatKey;
  label: string;
  total: number;
  percent: boolean;
  components: TooltipStatComponent[];
};

export type TooltipStatItem = {
  slot: string;
  levelRequirement: number | null;
  starForce: number | null;
  statLines: string;
  flameStats: string;
  catalogBaseStats: Record<string, number> | null;
  catalogStarForceProfile: string | null;
};

const STAT_ORDER: TooltipStatKey[] = [
  "STR", "DEX", "INT", "LUK", "ALL_STATS", "MAX_HP", "MAX_MP", "ATTACK_POWER", "MAGIC_ATTACK",
  "DEFENSE", "SPEED", "JUMP", "BOSS_DAMAGE", "DAMAGE", "ENEMY_DEFENSE_IGNORED",
];

const STAT_LABELS: Record<TooltipStatKey, string> = {
  STR: "STR", DEX: "DEX", INT: "INT", LUK: "LUK", ALL_STATS: "All Stats",
  MAX_HP: "Max HP", MAX_MP: "Max MP", ATTACK_POWER: "Attack Power", MAGIC_ATTACK: "Magic Attack",
  DEFENSE: "Defense", SPEED: "Speed", JUMP: "Jump", BOSS_DAMAGE: "Boss Damage", DAMAGE: "Damage",
  ENEMY_DEFENSE_IGNORED: "Enemy Defense Ignored",
};

const PERCENT_STATS = new Set<TooltipStatKey>(["ALL_STATS", "BOSS_DAMAGE", "DAMAGE", "ENEMY_DEFENSE_IGNORED"]);

export function equipmentTooltipStatRows(item: TooltipStatItem): TooltipStatRow[] {
  const base = normalizeStats(item.catalogBaseStats);
  const flame = parseStats(item.flameStats);
  const explicit = parseStats(item.statLines);
  const starForce = starForceBonuses({
    slot: item.slot,
    levelRequirement: item.levelRequirement,
    starForceProfile: item.catalogStarForceProfile,
    baseStats: base as Partial<Record<StarForceStat, number>>,
  }, item.starForce ?? 0) as Partial<Record<TooltipStatKey, number>>;

  return STAT_ORDER.flatMap((key) => {
    const baseValue = base[key] ?? 0;
    const starValue = starForce[key] ?? 0;
    const flameValue = flame[key] ?? 0;
    const knownTotal = baseValue + starValue + flameValue;
    const total = explicit[key] ?? knownTotal;
    if (total === 0 && knownTotal === 0) return [];
    const otherValue = total - knownTotal;
    const components: TooltipStatComponent[] = [];
    if (baseValue !== 0 || starValue !== 0 || flameValue !== 0) components.push({ kind: "base", value: baseValue });
    if (starValue !== 0) components.push({ kind: "starForce", value: starValue });
    if (flameValue !== 0) components.push({ kind: "flame", value: flameValue });
    if (otherValue !== 0) components.push({ kind: "other", value: otherValue });
    return [{ key, label: STAT_LABELS[key], total, percent: PERCENT_STATS.has(key), components }];
  });
}

export function starForceRows(current: number, cap: number): boolean[][][] {
  const groups = Array.from({ length: Math.ceil(cap / 5) }, (_, groupIndex) =>
    Array.from({ length: Math.min(5, cap - groupIndex * 5) }, (_, starIndex) => groupIndex * 5 + starIndex < current));
  const rows: boolean[][][] = [];
  for (let index = 0; index < groups.length; index += 3) rows.push(groups.slice(index, index + 3));
  return rows;
}

function normalizeStats(value: Record<string, number> | null): Partial<Record<TooltipStatKey, number>> {
  const result: Partial<Record<TooltipStatKey, number>> = {};
  for (const [label, amount] of Object.entries(value ?? {})) {
    const stat = normalizeStatName(label);
    if (stat && Number.isFinite(amount)) result[stat] = amount;
  }
  return result;
}

function parseStats(value: string): Partial<Record<TooltipStatKey, number>> {
  const result: Partial<Record<TooltipStatKey, number>> = {};
  for (const line of value.split(/\r?\n/)) {
    const match = line.trim().match(/^(.+?)(?:\s*:\s*|\s+)[+]?(-?[\d,]+)/);
    if (!match) continue;
    const stat = normalizeStatName(match[1]);
    if (stat) result[stat] = Number(match[2].replaceAll(",", ""));
  }
  return result;
}

function normalizeStatName(value: string): TooltipStatKey | null {
  const key = value.toLowerCase().replace(/[^a-z]/g, "");
  return ({
    str: "STR", dex: "DEX", int: "INT", luk: "LUK", allstat: "ALL_STATS", allstats: "ALL_STATS",
    maxhp: "MAX_HP", maxmp: "MAX_MP", attackpower: "ATTACK_POWER", attack: "ATTACK_POWER", att: "ATTACK_POWER",
    magicattack: "MAGIC_ATTACK", magicatt: "MAGIC_ATTACK", matt: "MAGIC_ATTACK", defense: "DEFENSE", def: "DEFENSE",
    speed: "SPEED", jump: "JUMP", bossdamage: "BOSS_DAMAGE", damage: "DAMAGE",
    enemydefenseignored: "ENEMY_DEFENSE_IGNORED", ignoredenemydefense: "ENEMY_DEFENSE_IGNORED", ied: "ENEMY_DEFENSE_IGNORED",
  } as Record<string, TooltipStatKey>)[key] ?? null;
}
