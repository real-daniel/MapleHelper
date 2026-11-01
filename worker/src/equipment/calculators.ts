import { starForceBonuses, type StarForceStat } from "../../../shared/star-force";
import {
  EQUIPMENT_STATS,
  equipmentStatLabel,
  findBestCatalogFacts,
  parseEquipmentStatLines,
  type CatalogEquipmentFacts,
  type EquipmentStat,
  type ParsedEquipmentText,
} from "./domain";

export function starForceContribution(item: CatalogEquipmentFacts, stat: EquipmentStat, starForce: number): number {
  return starForceBonuses(item, starForce)[stat as StarForceStat] ?? 0;
}

interface FlameVector { values: Partial<Record<EquipmentStat, number>> }
interface FlameCandidate { name: string; tier: number; contribution: FlameVector }
const MAIN_STATS: EquipmentStat[] = ["STR", "DEX", "INT", "LUK"];
const SOLVABLE_STATS = new Set<EquipmentStat>(["STR", "DEX", "INT", "LUK", "ALL_STATS", "ATTACK_POWER", "MAGIC_ATTACK", "SPEED", "JUMP", "BOSS_DAMAGE", "DAMAGE"]);

function flameCandidates(item: CatalogEquipmentFacts): FlameCandidate[] {
  if (item.levelRequirement == null || item.starForceProfile === "NONE") return [];
  const result: FlameCandidate[] = [];
  const singleUnit = item.levelRequirement >= 230 ? 12 : Math.max(1, Math.floor(item.levelRequirement / 20) + 1);
  const dualUnit = item.levelRequirement >= 250 ? 7 : item.levelRequirement >= 200 ? 6 : Math.max(1, Math.floor(item.levelRequirement / 40) + 1);
  for (const stat of MAIN_STATS) for (let tier = 1; tier <= 7; tier++) result.push(candidate(equipmentStatLabel(stat), tier, { [stat]: singleUnit * tier }));
  for (let first = 0; first < MAIN_STATS.length; first++) for (let second = first + 1; second < MAIN_STATS.length; second++) {
    for (let tier = 1; tier <= 7; tier++) {
      result.push(candidate(`${equipmentStatLabel(MAIN_STATS[first])} & ${equipmentStatLabel(MAIN_STATS[second])}`, tier,
        { [MAIN_STATS[first]]: dualUnit * tier, [MAIN_STATS[second]]: dualUnit * tier }));
    }
  }
  if (item.levelRequirement >= 70) for (let tier = 1; tier <= 7; tier++) result.push(candidate("All Stats", tier, { ALL_STATS: tier }));
  for (let tier = 1; tier <= 7; tier++) {
    if (item.slot === "WEAPON") {
      addWeaponAttackCandidate(result, item, "ATTACK_POWER", "Attack Power", tier);
      addWeaponAttackCandidate(result, item, "MAGIC_ATTACK", "Magic Attack", tier);
      if (item.levelRequirement >= 90) result.push(candidate("Boss Damage", tier, { BOSS_DAMAGE: tier * 2 }));
      result.push(candidate("Damage", tier, { DAMAGE: tier }));
    } else {
      result.push(candidate("Attack Power", tier, { ATTACK_POWER: tier }));
      result.push(candidate("Magic Attack", tier, { MAGIC_ATTACK: tier }));
      result.push(candidate("Speed", tier, { SPEED: tier }));
      result.push(candidate("Jump", tier, { JUMP: tier }));
    }
  }
  return result;
}

function candidate(name: string, tier: number, values: Partial<Record<EquipmentStat, number>>): FlameCandidate {
  return { name, tier, contribution: { values } };
}
function addWeaponAttackCandidate(result: FlameCandidate[], item: CatalogEquipmentFacts, stat: EquipmentStat, name: string, tier: number) {
  const baseAttack = item.baseStats[stat] ?? 0;
  if (baseAttack <= 0 || tier < 3 || item.levelRequirement == null) return;
  result.push(candidate(name, tier, { [stat]: weaponAttackBonus(item.levelRequirement, baseAttack, tier) }));
}
function weaponAttackBonus(level: number, baseAttack: number, tier: number): number {
  const bands = [
    [.03,.044,.0605,.0799,.1025], [.06,.088,.121,.1597,.205], [.09,.132,.1815,.2396,.3075],
    [.12,.176,.242,.3194,.4099], [.15,.22,.3025,.3993,.5124], [.18,.264,.363,.4792,.6149],
    [.21,.308,.4235,.559,.7174],
  ];
  const band = level < 40 ? 0 : level < 80 ? 1 : level < 120 ? 2 : level < 160 ? 3 : level < 200 ? 4 : level < 250 ? 5 : 6;
  return Math.ceil(baseAttack * bands[band][tier - 3]);
}

export function solveFlameLines(facts: CatalogEquipmentFacts, displayedFlames: ReadonlyMap<EquipmentStat, number>): string {
  const target = new Map<EquipmentStat, number>();
  for (const [stat, value] of displayedFlames) if (value > 0 && SOLVABLE_STATS.has(stat)) target.set(stat, value);
  if (target.size === 0) return "";
  const candidates = flameCandidates(facts).filter((item) => Object.keys(item.contribution.values).some((key) => target.has(key as EquipmentStat)));
  if (candidates.length === 0) return "";

  let best: FlameCandidate[] = [];
  let bestScore = Number.MAX_SAFE_INTEGER;
  const search = (start: number, selected: FlameCandidate[], sum: Partial<Record<EquipmentStat, number>>) => {
    if (selected.length) {
      let score = 0;
      for (const stat of SOLVABLE_STATS) {
        const delta = (sum[stat] ?? 0) - (target.get(stat) ?? 0);
        score += delta * delta;
      }
      if (score < bestScore || (score === bestScore && selected.length > best.length)) {
        bestScore = score;
        best = [...selected];
      }
    }
    if (selected.length === 4) return;
    for (let index = start; index < candidates.length; index++) {
      const next = candidates[index];
      if (selected.some((existing) => existing.name === next.name)) continue;
      const nextSum = { ...sum };
      for (const [key, value] of Object.entries(next.contribution.values)) {
        const stat = key as EquipmentStat;
        nextSum[stat] = (nextSum[stat] ?? 0) + (value ?? 0);
      }
      if (Object.entries(nextSum).some(([key, value]) => (value ?? 0) > (target.get(key as EquipmentStat) ?? 0) + 8)) continue;
      selected.push(next);
      search(index + 1, selected, nextSum);
      selected.pop();
    }
  };
  search(0, [], {});
  return best.sort((left, right) => displayPriority(left.name) - displayPriority(right.name) || left.name.localeCompare(right.name))
    .map(displayCandidate).join("\n");
}

function displayCandidate(value: FlameCandidate): string {
  const percent = ["ALL_STATS", "BOSS_DAMAGE", "DAMAGE"].some((stat) => value.contribution.values[stat as EquipmentStat] != null) ? "%" : "";
  const amount = Object.values(value.contribution.values)[0] ?? 0;
  return `${value.name}: +${amount}${percent} (Tier ${value.tier})`;
}
function displayPriority(name: string): number {
  if (name === "All Stats") return 0;
  if (!name.includes("&") && ["STR", "DEX", "INT", "LUK"].includes(name)) return 1;
  if (name.includes("&")) return 2;
  return ({ "Attack Power": 3, "Magic Attack": 4, "Boss Damage": 5, Damage: 6, Speed: 7, Jump: 8 } as Record<string, number>)[name] ?? 10;
}

export function deriveFlameStats(parsed: ParsedEquipmentText, catalog: readonly CatalogEquipmentFacts[]): string {
  if (parsed.starForce == null) return "";
  if (parsed.slot === "WEAPON" && parsed.flameStats.trim()) return parsed.flameStats.trim();
  const facts = findBestCatalogFacts(catalog, parsed.name, parsed.slot, parsed.levelRequirement);
  return facts ? formatDisplayedFlames(displayedFlames(parsed, facts)) : "";
}

export function deriveFlameScoreLines(parsed: ParsedEquipmentText, catalog: readonly CatalogEquipmentFacts[]): string {
  if (parsed.starForce == null) return "";
  const facts = findBestCatalogFacts(catalog, parsed.name, parsed.slot, parsed.levelRequirement);
  if (!facts) return "";
  let source: Map<EquipmentStat, number>;
  if (facts.slot === "WEAPON" && parsed.flameStats.trim()) {
    source = new Map(parseEquipmentStatLines(parsed.flameStats).map((line) => [line.stat, line.total]));
  } else {
    source = displayedFlames(parsed, facts);
  }
  return solveFlameLines(facts, source);
}

function displayedFlames(parsed: ParsedEquipmentText, facts: CatalogEquipmentFacts): Map<EquipmentStat, number> {
  const result = new Map<EquipmentStat, number>();
  for (const line of parseEquipmentStatLines(parsed.statLines)) {
    if (line.stat === "DEFENSE") continue;
    const flame = line.total - (facts.baseStats[line.stat] ?? 0) - starForceContribution(facts, line.stat, parsed.starForce ?? 0);
    const normalized = ["MAX_HP", "MAX_MP", "DEFENSE"].includes(line.stat) && Math.abs(flame) <= 3 ? 0 : flame;
    if (normalized > 0) result.set(line.stat, normalized);
  }
  return result;
}
function formatDisplayedFlames(values: ReadonlyMap<EquipmentStat, number>): string {
  return [...values].map(([stat, value]) => `${equipmentStatLabel(stat)}: +${value}${["ALL_STATS", "BOSS_DAMAGE", "DAMAGE"].includes(stat) ? "%" : ""}`).join("\n");
}

export function isSweetwaterItem(name: string | null | undefined): boolean {
  return Boolean(name?.toLowerCase().includes("sweetwater"));
}

export function preferredFlameStats(parsed: ParsedEquipmentText, colorExtracted: string, catalog: readonly CatalogEquipmentFacts[]): string {
  const calculated = deriveFlameStats(parsed, catalog);
  return firstNonBlank(parsed.slot === "WEAPON" ? [colorExtracted, calculated, parsed.flameStats] : [calculated, colorExtracted, parsed.flameStats]);
}
function firstNonBlank(values: readonly string[]): string { return values.find((value) => value?.trim())?.trim() ?? ""; }

// Kept exported for parity tests and future table expansion.
export const ALL_EQUIPMENT_STATS = EQUIPMENT_STATS;
