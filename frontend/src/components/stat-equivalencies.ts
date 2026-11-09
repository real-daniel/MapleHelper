import { classStatProfile, type CharacterDamageStat } from "./class-stat-profiles";

export type CharacterStatEquivalency = {
  stat: string;
  quantity: number;
  finalDamagePercent: number;
};

export function equivalencyFieldsForJob(jobName: string) {
  const profile = classStatProfile(jobName);
  const statFields = [...profile.primaryStats, ...profile.secondaryStats]
    .flatMap((stat) => stat === "Max HP" ? ["Max HP", "Max HP%"] : [stat, `${stat}%`]);
  return unique([
    ...statFields,
    "All Stat%",
    profile.attackStat,
    `${profile.attackStat}%`,
    "Boss Damage",
    "Critical Dmg",
    "IED (300)",
    "IED (380)",
  ]);
}

export function equivalencyMap(entries: CharacterStatEquivalency[]) {
  const result = new Map<string, number>();
  for (const entry of entries) {
    if (!Number.isFinite(entry.quantity) || entry.quantity <= 0 || !Number.isFinite(entry.finalDamagePercent)) continue;
    result.set(normalizeEquivalencyLabel(entry.stat), entry.finalDamagePercent / entry.quantity);
  }
  return result;
}

export function normalizeEquivalencyLabel(value: string) {
  const compact = value.toLowerCase().replace(/magic attack/g, "attack").replace(/[^a-z0-9%]/g, "");
  if (compact.includes("ignore") || compact.startsWith("ied")) {
    if (compact.includes("380")) return "IED (380)";
    if (compact.includes("300")) return "IED (300)";
    return "IED (380)";
  }
  if (compact.includes("boss")) return "Boss Damage";
  if (compact === "damage" || compact === "damage%") return "Boss Damage";
  if (compact.includes("critical")) return "Critical Dmg";
  if (compact.includes("allstat")) return "All Stat%";
  if (compact.includes("maxhp%") || compact === "hp%") return "Max HP%";
  if (compact.includes("maxhp") || compact === "hp") return "Max HP";
  for (const stat of ["STR", "DEX", "INT", "LUK"] as CharacterDamageStat[]) {
    if (compact === `${stat.toLowerCase()}%`) return `${stat}%`;
    if (compact === stat.toLowerCase()) return stat;
  }
  if (compact.includes("attack%") || compact === "att%") return "Attack%";
  if (compact.includes("attack") || compact === "att") return "Attack";
  return value.trim();
}

function unique(values: string[]) {
  return [...new Set(values)];
}
