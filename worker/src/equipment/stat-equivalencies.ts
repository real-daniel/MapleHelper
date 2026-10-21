export interface StatEquivalency {
  stat: string;
  quantity: number;
  finalDamagePercent: number;
}

const STAT_ALIASES: Record<string, string> = {
  ALLSTAT: "All Stat%", ALLSTATS: "All Stat%", "ALLSTAT%": "All Stat%", "ALLSTATS%": "All Stat%",
  ANSTAT: "All Stat%", "ANSTAT%": "All Stat%", ATTACKS: "Attack%", "ATTACK%S": "Attack%",
  ATTACK: "Attack", "ATTACK%": "Attack%", BOSSDAMAGE: "Boss Damage", CRITICALDMG: "Critical Dmg",
  DEX: "DEX", "DEX%": "DEX%", IGNOREDFF300: "Ignore Def(300)", IGNOREDFF380: "Ignore Def(380)",
  IGNOREDEF300: "Ignore Def(300)", IGNOREDEF380: "Ignore Def(380)", STR: "STR", "STR%": "STR%",
};

export function parseStatEquivalencyText(rawText: string | null | undefined): StatEquivalency[] {
  if (!rawText) return [];
  const results: StatEquivalency[] = [];
  const seen = new Set<string>();
  for (const line of rawText.split(/\r?\n/)) {
    const parsed = parseStatEquivalencyLine(line);
    if (!parsed || seen.has(parsed.stat)) continue;
    seen.add(parsed.stat);
    results.push(parsed);
  }
  return results;
}

export function parseStatEquivalencyLine(line: string): StatEquivalency | null {
  const normalized = normalizeSpacing(line);
  if (!normalized || normalized.toLowerCase().includes("final")) return null;
  const match = normalized.match(/^(.+?)\s+(\d{1,4})\s+(\d+(?:[.,]\d+)?)\s*%?$/);
  if (!match) return null;
  const stat = normalizeStat(match[1]);
  if (!stat) return null;
  return { stat, quantity: Number.parseInt(match[2], 10), finalDamagePercent: Number.parseFloat(match[3].replace(",", ".")) };
}

export function formatStatEquivalencies(values: readonly StatEquivalency[]): string {
  return values.map((item) => `${item.stat}: ${item.quantity} = ${item.finalDamagePercent.toFixed(3)}% final damage`).join("\n");
}

function normalizeSpacing(line: string): string {
  return line.trim().replaceAll("|", " ").replace(/[‘’]/g, "").replaceAll("by%", "by %").replace(/\s+/g, " ");
}
function normalizeStat(value: string): string | null {
  const compact = value.replace(/[^A-Za-z0-9%]/g, "").toUpperCase();
  if (compact.startsWith("NOTAFFECTEDBY%")) {
    const stat = compact.slice("NOTAFFECTEDBY%".length);
    if (["STR", "DEX", "INT", "LUK"].includes(stat)) return `Not Affected by % ${stat}`;
  }
  return STAT_ALIASES[compact] ?? null;
}
