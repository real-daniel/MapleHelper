import type { EquipmentSlot } from "../types";
import {
  equipmentStatFromOcrName,
  equipmentStatLabel,
  findBestCatalogFacts,
  findSkillRingName,
  type CatalogEquipmentFacts,
  type ParsedEquipmentText,
} from "./domain";

const POSSIBLE_STAT_LINE_PATTERN = /^\s*([A-Za-z0-9 .]{2,28}?)\s*:?\s+([+\-#]\s*\d{1,5})\s*(%?)\s*(?:\([^)]*\))?.*/;
const LEVEL_PATTERN = /required\s*level\s*lv[.,]?\s*(\d{1,3})/i;
const POTENTIAL_TIER_PATTERN = /(bonus\s+)?potential\s*:?\s*(rare|epic|unique|legendary)/i;
const STAT_LINE_PATTERN = /^(str|dex|int|luk|all\s*stats?|max\s*hp|max\s*mp|attack\s*power|magic\s*att|defense|speed|jump|boss\s*damage|enemy\s*def\s*ignored)\b.*/i;
const EQUIPMENT_STAT_COMPONENT_PATTERN = /^(str|dex|int|luk|all\s*stats?|max\s*hp|max\s*mp|attack\s*power|magic\s*att|defense|speed|jump|boss\s*damage|damage)\b\s*[:+ ]*([+\-]?\s*\d{1,5}\s*%?)\s*\(([^)]*)\).*/i;
const COMPONENT_VALUE_PATTERN = /([+\-]?\s*\d{1,5}\s*%?)/g;
const POTENTIAL_LINE_PATTERN = /.*?\b(str|dex|int|luk|all\s*stats?|boss\s*damage|damage|critical\s*damage|crit(?:ical)?\s*dmg|attack\s*power|att(?:ack)?|magic\s*att(?:ack)?|m\.\s*att(?:ack)?|item\s*drop(?:\s*rate)?|drop\s*rate|meso(?:s)?(?:\s*obtained)?|enemy\s*def(?:ense)?\s*ignored|ignore\s*enemy\s*def(?:ense)?|ied)\b\s*[':;/| ]*([+\-]?\s*\d{1,3}\s*%?).*/i;

export function parseEquipmentText(
  rawText: string | null | undefined,
  starForce: number | null,
  catalog: readonly CatalogEquipmentFacts[],
): ParsedEquipmentText {
  const lines = (rawText ?? "").split(/\r?\n/).map(normalizeLine).filter(Boolean);
  const detectedSlot = findSlot(lines);
  let name = findName(lines);
  let levelRequirement = correctLevelRequirement(name, findLevelRequirement(lines));
  const match = findBestCatalogFacts(catalog, name, detectedSlot, levelRequirement);
  const slot = match?.slot ?? detectedSlot;
  name = match?.name ?? name;
  if (levelRequirement == null && match) levelRequirement = match.levelRequirement;

  const statLines: string[] = [];
  const flameStats: string[] = [];
  const potentialLines: string[] = [];
  const bonusPotentialLines: string[] = [];
  let potentialTier = "";
  let bonusPotentialTier = "";
  let inPotential = false;
  let inBonusPotential = false;

  for (const line of lines) {
    const tierMatch = line.match(POTENTIAL_TIER_PATTERN);
    if (tierMatch) {
      const tier = capitalize(tierMatch[2]);
      if (!tierMatch[1]) {
        potentialTier = tier;
        inPotential = true;
        inBonusPotential = false;
      } else {
        bonusPotentialTier = tier;
        inPotential = false;
        inBonusPotential = true;
      }
      continue;
    }

    if (endsPotentialSection(line)) {
      inPotential = false;
      inBonusPotential = false;
    }

    const potentialLine = cleanPotentialLine(line);
    if (potentialLine && (inPotential || inBonusPotential)) {
      (inBonusPotential ? bonusPotentialLines : potentialLines).push(potentialLine);
      continue;
    }

    const flameLine = cleanFlameLine(line, starForce);
    if (flameLine) flameStats.push(flameLine);
    const statLine = canonicalizeStatLine(line);
    if (statLine) statLines.push(statLine);
  }

  return {
    slot,
    name,
    levelRequirement,
    starForce,
    statLines: statLines.join("\n"),
    flameStats: flameStats.join("\n"),
    potentialTier,
    potentialLines: potentialLines.join("\n"),
    bonusPotentialTier,
    bonusPotentialLines: bonusPotentialLines.join("\n"),
  };
}

function normalizeLine(value: string): string {
  return value.replace(/[|®•=]/g, " ").replace(/\s+/g, " ")
    .replace(/^BBR\b/i, "STR")
    .replace(/^Alstats\b/i, "All Stats")
    .replace(/^Allstats\b/i, "All Stats")
    .replace(/^Aitack\s*Power\b/i, "Attack Power")
    .replace(/^AttackPower\b/i, "Attack Power")
    .replace(/^BossDamage\b/i, "Boss Damage")
    .replace(/^STR['/:]?\s*/i, "STR ")
    .replace(/^DEX['/:]?\s*/i, "DEX ")
    .replace(/^INT['/:]?\s*/i, "INT ")
    .replace(/^LUK['/:]?\s*/i, "LUK ")
    .trim();
}

function findSlot(lines: readonly string[]): EquipmentSlot | null {
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("eari") || lower.includes("earring")) return "EARRINGS";
    if (lower.includes("bottom") || lower.includes("pants")) return "BOTTOM";
    if (lower.includes("shoes")) return "SHOES";
    if (lower.includes("gloves")) return "GLOVES";
    if (lower.includes("cape")) return "CAPE";
    if (lower.includes("hat")) return "HAT";
    if (lower.includes("armor") && lower.includes("top")) return "TOP";
    if (lower.includes("weapon")) return "WEAPON";
    if (lower.includes("secondary")) return "SECONDARY";
    if (lower.includes("emblem")) return "EMBLEM";
    if (lower.includes("belt")) return "BELT";
    if (lower.includes("shoulder")) return "SHOULDER";
    if (lower.includes("face")) return "FACE";
    if (lower.includes("eye")) return "EYE";
    if (lower.includes("pendant")) return "PENDANT";
    if (lower.includes("ring")) return "RING";
    if (lower.includes("badge")) return "BADGE";
    if (lower.includes("medal")) return "MEDAL";
    if (lower.includes("heart")) return "HEART";
    if (lower.includes("android")) return "ANDROID";
    if (lower.includes("pocket")) return "POCKET";
    if (lower.includes("totem")) return "TOTEM";
  }
  return null;
}

function canonicalizeStatLine(line: string): string | null {
  const match = line.match(POSSIBLE_STAT_LINE_PATTERN);
  if (!match) return null;
  const stat = equipmentStatFromOcrName(match[1]);
  if (!stat) return null;
  const nameOffset = line.indexOf(match[1]);
  return equipmentStatLabel(stat) + line.slice(nameOffset + match[1].length);
}

function findName(lines: readonly string[]): string {
  const skillRing = findSkillRingName(lines.join("\n"));
  if (skillRing) return skillRing;
  for (let index = 0; index < lines.length; index++) {
    if (lines[index].toLowerCase().includes("untradable") && index > 0) return cleanName(lines[index - 1]);
  }
  return cleanName(lines.find((line) => /[A-Za-z]{3,}/.test(line) && !isUiNoise(line)) ?? "");
}

function cleanName(line: string): string { return line.replace(/^[^A-Za-z]+/, "").trim(); }
function isUiNoise(line: string): boolean {
  const lower = line.toLowerCase();
  return ["currently equipped", "combat power", "required", "set effect", "potential", "interact", "enhancement"]
    .some((noise) => lower.includes(noise));
}
function endsPotentialSection(line: string): boolean {
  const lower = line.toLowerCase();
  return lower.startsWith("exceptional") || lower.includes("enhancement details") || lower.includes("soul");
}
function findLevelRequirement(lines: readonly string[]): number | null {
  for (const line of lines) {
    const match = line.match(LEVEL_PATTERN);
    if (match) return Number.parseInt(match[1], 10);
  }
  return null;
}
function correctLevelRequirement(name: string, level: number | null): number | null {
  return name.toLowerCase().includes("eternal") && (level == null || (level >= 240 && level <= 260)) ? 250 : level;
}

function cleanPotentialLine(line: string): string | null {
  const match = line.match(POTENTIAL_LINE_PATTERN);
  if (!match) return null;
  let value = match[2].replace(/\s+/g, "");
  if (!value.startsWith("+") && !value.startsWith("-")) value = `+${value}`;
  return `${normalizePotentialStat(match[1])}: ${value}`;
}

function cleanFlameLine(line: string, starForce: number | null): string | null {
  if (!STAT_LINE_PATTERN.test(line)) return null;
  const match = line.match(EQUIPMENT_STAT_COMPONENT_PATTERN);
  if (!match) return null;
  const stat = normalizeEquipmentStat(match[1]);
  const total = normalizeNumber(match[2]);
  const components = [...match[3].matchAll(COMPONENT_VALUE_PATTERN)].map((candidate) => normalizeNumber(candidate[1]));
  const flameValue = inferFlameValue(total, components, starForce);
  return flameValue && !isZero(flameValue) ? `${stat}: ${flameValue}` : null;
}

function inferFlameValue(total: string, components: readonly string[], starForce: number | null): string | null {
  if (components.length >= 3) return components[components.length - 1];
  if (components.length === 1 && stripPercent(total) === stripPercent(components[0])) return components[0];
  if (components.length === 2 && starForce != null && starForce <= 0) return components[1];
  return null;
}

function normalizeEquipmentStat(value: string): string {
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
  return ({
    str: "STR", dex: "DEX", int: "INT", luk: "LUK", "all stat": "All Stats", "all stats": "All Stats",
    "max hp": "Max HP", "max mp": "Max MP", "attack power": "Attack Power", "magic att": "Magic Attack",
    defense: "Defense", speed: "Speed", jump: "Jump", "boss damage": "Boss Damage", damage: "Damage",
  } as Record<string, string>)[normalized] ?? capitalize(normalized);
}
function normalizeNumber(value: string): string {
  const normalized = value.replace(/\s+/g, "");
  return normalized.startsWith("+") || normalized.startsWith("-") ? normalized : `+${normalized}`;
}
function isZero(value: string): boolean { return stripPercent(value).replace(/[+\-]/g, "").replace(/0/g, "") === ""; }
function stripPercent(value: string): string { return value.replaceAll("%", ""); }

function normalizePotentialStat(value: string): string {
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
  return ({
    str: "STR", dex: "DEX", int: "INT", luk: "LUK", "all stat": "All Stats", "all stats": "All Stats",
    "boss damage": "Boss Damage", damage: "Damage", "critical damage": "Critical Damage", "critical dmg": "Critical Damage",
    "crit dmg": "Critical Damage", "attack power": "Attack Power", attack: "Attack Power", att: "Attack Power",
    "magic att": "Magic Attack", "magic attack": "Magic Attack", "m. att": "Magic Attack", "m. attack": "Magic Attack",
    "item drop": "Item Drop Rate", "item drop rate": "Item Drop Rate", "drop rate": "Item Drop Rate",
    meso: "Meso Obtained", mesos: "Meso Obtained", "meso obtained": "Meso Obtained", "mesos obtained": "Meso Obtained",
    "enemy def ignored": "Enemy Defense Ignored", "enemy defense ignored": "Enemy Defense Ignored",
    "ignore enemy def": "Enemy Defense Ignored", "ignore enemy defense": "Enemy Defense Ignored", ied: "Enemy Defense Ignored",
  } as Record<string, string>)[normalized] ?? capitalize(normalized);
}
function capitalize(value: string): string {
  const lower = value.toLowerCase();
  return lower ? lower[0].toUpperCase() + lower.slice(1) : "";
}
