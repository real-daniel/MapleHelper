export type StarForceStat =
  | "STR" | "DEX" | "INT" | "LUK" | "MAX_HP" | "MAX_MP"
  | "ATTACK_POWER" | "MAGIC_ATTACK" | "DEFENSE" | "SPEED" | "JUMP";

export interface StarForceItemFacts {
  name?: string;
  slot: string;
  levelRequirement: number | null;
  starForceProfile: string | null | undefined;
  baseStats: Partial<Record<StarForceStat, number>>;
  isOverall?: boolean;
}

interface StarForceValue {
  classStat: number;
  maxHpMp: number;
  attack: number;
  glovesAttack: number;
  shoesSpeed: number;
  shoesJump: number;
}

const sfValue = (classStat: number, maxHpMp: number, attack: number, glovesAttack: number, shoesSpeed: number, shoesJump: number): StarForceValue =>
  ({ classStat, maxHpMp, attack, glovesAttack, shoesSpeed, shoesJump });

const LOW_STAR_VALUES: StarForceValue[] = [
  sfValue(0, 0, 0, 0, 0, 0), sfValue(2, 5, 0, 0, 0, 0), sfValue(4, 10, 0, 0, 0, 0),
  sfValue(6, 15, 0, 0, 1, 1), sfValue(8, 25, 0, 0, 2, 2), sfValue(10, 35, 0, 1, 3, 3),
  sfValue(13, 50, 0, 1, 4, 4), sfValue(16, 65, 0, 2, 5, 5), sfValue(19, 85, 0, 2, 6, 6),
  sfValue(22, 105, 0, 3, 7, 7), sfValue(25, 130, 0, 3, 8, 8), sfValue(28, 155, 0, 4, 10, 10),
  sfValue(31, 180, 0, 4, 12, 12), sfValue(34, 205, 0, 5, 14, 14), sfValue(37, 230, 0, 6, 16, 16),
  sfValue(40, 255, 0, 7, 18, 18),
];

interface LevelBand { min: number; max: number; rows: number[][] }
const HIGH_STAR_BANDS: LevelBand[] = [
  { min: 128, max: 137, rows: [[47,255,7],[54,255,15],[61,255,24],[68,255,34],[75,255,45]] },
  { min: 138, max: 149, rows: [[49,255,8],[58,255,17],[67,255,27],[76,255,38],[85,255,50],[94,255,63],[103,255,78],[103,255,95],[103,255,114],[103,255,135],[103,255,157],[103,255,180],[103,255,204],[103,255,229],[103,255,255]] },
  { min: 150, max: 159, rows: [[51,255,9],[62,255,19],[73,255,30],[84,255,42],[95,255,55],[106,255,69],[117,255,85],[117,255,103],[117,255,123],[117,255,145],[117,255,168],[117,255,192],[117,255,217],[117,255,243],[117,255,270]] },
  { min: 160, max: 199, rows: [[53,255,10],[66,255,21],[79,255,33],[92,255,46],[105,255,60],[118,255,75],[131,255,92],[131,255,111],[131,255,132],[131,255,155],[131,255,179],[131,255,204],[131,255,230],[131,255,257],[131,255,285]] },
  { min: 200, max: 249, rows: [[55,255,12],[70,255,25],[85,255,39],[100,255,54],[115,255,70],[130,255,87],[145,255,106],[145,255,127],[145,255,150],[145,255,175],[145,255,201],[145,255,228],[145,255,256],[145,255,285],[145,255,315]] },
  { min: 250, max: 300, rows: [[57,255,14],[74,255,29],[91,255,45],[108,255,62],[125,255,80],[142,255,99],[159,255,120],[159,255,143],[159,255,168],[159,255,195],[159,255,223],[159,255,252],[159,255,282],[159,255,313],[159,255,345]] },
];

const WEAPON_HIGH_ATTACK_BANDS: LevelBand[] = [
  { min: 128, max: 137, rows: [[47,255,6],[54,255,13],[61,255,20],[68,255,28],[75,255,37]] },
  { min: 138, max: 149, rows: [[49,255,7],[58,255,15],[67,255,23],[76,255,32],[85,255,42],[94,255,54],[103,255,65],[103,255,95],[103,255,126],[103,255,158],[103,255,191],[103,255,225],[103,255,260],[103,255,296],[103,255,333]] },
  { min: 150, max: 159, rows: [[51,255,8],[62,255,17],[73,255,26],[84,255,36],[95,255,47],[106,255,59],[117,255,72],[117,255,103],[117,255,135],[117,255,168],[117,255,202],[117,255,237],[117,255,273],[117,255,310],[117,255,348]] },
  { min: 160, max: 199, rows: [[53,255,9],[66,255,18],[79,255,28],[92,255,39],[105,255,51],[118,255,64],[131,255,78],[131,255,110],[131,255,143],[131,255,177],[131,255,212],[131,255,248],[131,255,285],[131,255,323],[131,255,362]] },
  { min: 200, max: 249, rows: [[55,255,13],[70,255,26],[85,255,40],[100,255,54],[115,255,69],[130,255,85],[145,255,102],[145,255,136],[145,255,171],[145,255,207],[145,255,244],[145,255,282],[145,255,321],[145,255,361],[145,255,402]] },
  { min: 250, max: 300, rows: [[57,255,16],[74,255,32],[91,255,49],[108,255,66],[125,255,84],[142,255,103],[159,255,123],[159,255,163],[159,255,204],[159,255,246],[159,255,289],[159,255,333],[159,255,378],[159,255,424],[159,255,471]] },
];

interface SuperiorValue { allStats: number; attack: number }
const SUPERIOR_138: SuperiorValue[] = [
  { allStats: 0, attack: 0 }, { allStats: 17, attack: 0 }, { allStats: 35, attack: 0 },
  { allStats: 55, attack: 0 }, { allStats: 78, attack: 0 }, { allStats: 105, attack: 0 },
  { allStats: 105, attack: 8 }, { allStats: 105, attack: 17 }, { allStats: 105, attack: 27 },
  { allStats: 105, attack: 38 }, { allStats: 105, attack: 50 }, { allStats: 105, attack: 64 },
  { allStats: 105, attack: 80 }, { allStats: 105, attack: 98 }, { allStats: 105, attack: 118 },
  { allStats: 105, attack: 140 },
];
const SUPERIOR_150: SuperiorValue[] = [
  { allStats: 0, attack: 0 }, { allStats: 19, attack: 0 }, { allStats: 39, attack: 0 },
  { allStats: 61, attack: 0 }, { allStats: 86, attack: 0 }, { allStats: 115, attack: 0 },
  { allStats: 115, attack: 9 }, { allStats: 115, attack: 19 }, { allStats: 115, attack: 30 },
  { allStats: 115, attack: 42 }, { allStats: 115, attack: 55 }, { allStats: 115, attack: 70 },
  { allStats: 115, attack: 87 }, { allStats: 115, attack: 106 }, { allStats: 115, attack: 127 },
  { allStats: 115, attack: 150 },
];

export function starForceBonuses(item: StarForceItemFacts, stars: number): Partial<Record<StarForceStat, number>> {
  const profile = effectiveProfile(item);
  if (!Number.isInteger(stars) || stars <= 0 || item.levelRequirement == null || !profile || profile === "NONE") return {};
  if (profile === "SUPERIOR") return superiorBonuses(item, stars);
  const value = normalValue(item.levelRequirement, stars);
  if (!value) return {};

  const result: Partial<Record<StarForceStat, number>> = {};
  for (const stat of ["STR", "DEX", "INT", "LUK"] as const) {
    if (profile === "BADGE" || (item.baseStats[stat] ?? 0) > 0) result[stat] = value.classStat;
  }
  if (profile === "WEAPON") {
    result.MAX_HP = value.maxHpMp;
    result.MAX_MP = value.maxHpMp;
  } else if (profile !== "BADGE" && receivesArmorHpStarForce(item.slot)) {
    result.MAX_HP = value.maxHpMp;
  }
  if (profile !== "WEAPON" && profile !== "BADGE") {
    result.DEFENSE = scaledDefenseBonus(item.baseStats.DEFENSE ?? 0, stars, isOverall(item) ? 2 : 1);
  }
  if (profile === "WEAPON") {
    const highAttack = stars > 15 ? weaponHighAttack(item.levelRequirement, stars) : 0;
    for (const stat of ["ATTACK_POWER", "MAGIC_ATTACK"] as const) {
      const base = item.baseStats[stat] ?? 0;
      if (base > 0) result[stat] = weaponLowStarAttack(base, Math.min(stars, 15)) + highAttack;
    }
  } else if (profile !== "BADGE") {
    result.ATTACK_POWER = value.attack + (item.slot === "GLOVES" ? value.glovesAttack : 0);
    result.MAGIC_ATTACK = value.attack + (item.slot === "GLOVES" ? value.glovesAttack : 0);
  }
  if (item.slot === "SHOES") {
    result.SPEED = value.shoesSpeed;
    result.JUMP = value.shoesJump;
  }
  return Object.fromEntries(Object.entries(result).filter(([, amount]) => amount !== 0));
}

function effectiveProfile(item: StarForceItemFacts) {
  if (item.starForceProfile !== "NONE") return item.starForceProfile;
  const name = item.name?.trim() ?? "";
  if (item.slot === "SECONDARY" && /^astra\b/i.test(name)) {
    return /astra (?:katara|talisman|spirit charm)/i.test(name) ? "WEAPON" : "ARMOR_ACCESSORY";
  }
  if (item.slot === "BADGE" && /^(?:ghost ship exorcist|sengoku hakase badge|shackles of resentment)$/i.test(name)) return "BADGE";
  return item.starForceProfile;
}

function superiorBonuses(item: StarForceItemFacts, stars: number): Partial<Record<StarForceStat, number>> {
  const table = (item.levelRequirement ?? 0) >= 150 ? SUPERIOR_150 : SUPERIOR_138;
  const value = table[stars];
  if (!value) return {};
  return {
    STR: value.allStats, DEX: value.allStats, INT: value.allStats, LUK: value.allStats,
    ATTACK_POWER: value.attack, MAGIC_ATTACK: value.attack,
    DEFENSE: scaledDefenseBonus(item.baseStats.DEFENSE ?? 0, stars, isOverall(item) ? 2 : 1),
  };
}

function normalValue(level: number, stars: number): StarForceValue | null {
  if (stars <= 15) return LOW_STAR_VALUES[stars] ?? null;
  const band = HIGH_STAR_BANDS.find((candidate) => candidate.min <= level && level <= candidate.max);
  const row = band?.rows[stars - 16];
  return row ? sfValue(row[0], row[1], row[2], 7, 18, 18) : null;
}

function weaponHighAttack(level: number, stars: number) {
  const band = WEAPON_HIGH_ATTACK_BANDS.find((candidate) => candidate.min <= level && level <= candidate.max);
  return band?.rows[stars - 16]?.[2] ?? 0;
}

function weaponLowStarAttack(baseAttack: number, stars: number) {
  let current = baseAttack;
  for (let star = 0; star < stars; star++) current += Math.floor(current / 50) + 1;
  return current - baseAttack;
}

function scaledDefenseBonus(base: number, stars: number, increasesPerStar: number) {
  let current = Math.max(1, base);
  for (let star = 0; star < stars; star++) {
    for (let increase = 0; increase < increasesPerStar; increase++) current += Math.floor(current / 20) + 1;
  }
  return current - base;
}

function receivesArmorHpStarForce(slot: string) {
  return ["HAT", "TOP", "BOTTOM", "CAPE", "RING", "PENDANT", "BELT", "SHOULDER", "SECONDARY"].includes(slot);
}

function isOverall(item: StarForceItemFacts) {
  if (item.isOverall != null) return item.isOverall;
  return item.slot === "TOP" && /^(?:absolab|arcane umbra).+ suit$/i.test(item.name?.trim() ?? "");
}
