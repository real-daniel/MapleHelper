export type StarForceStat =
  | "STR" | "DEX" | "INT" | "LUK" | "MAX_HP" | "MAX_MP"
  | "ATTACK_POWER" | "MAGIC_ATTACK" | "DEFENSE" | "SPEED" | "JUMP";

export interface StarForceItemFacts {
  slot: string;
  levelRequirement: number | null;
  starForceProfile: string | null | undefined;
  baseStats: Partial<Record<StarForceStat, number>>;
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

export function starForceBonuses(item: StarForceItemFacts, stars: number): Partial<Record<StarForceStat, number>> {
  if (!Number.isInteger(stars) || stars <= 0 || item.levelRequirement == null || !item.starForceProfile || item.starForceProfile === "NONE") return {};
  const value = normalValue(item.levelRequirement, stars);
  if (!value) return {};

  const result: Partial<Record<StarForceStat, number>> = {};
  for (const stat of ["STR", "DEX", "INT", "LUK"] as const) {
    if ((item.baseStats[stat] ?? 0) > 0) result[stat] = value.classStat;
  }
  if (receivesHpMpStarForce(item.slot)) {
    result.MAX_HP = value.maxHpMp;
    result.MAX_MP = value.maxHpMp;
  }
  const defense = item.baseStats.DEFENSE ?? 0;
  if (defense > 0) result.DEFENSE = scaledFivePercentBonus(defense, stars);
  if (item.starForceProfile === "WEAPON") {
    for (const stat of ["ATTACK_POWER", "MAGIC_ATTACK"] as const) {
      const base = item.baseStats[stat] ?? 0;
      if (base > 0) result[stat] = weaponLowStarAttack(base, Math.min(stars, 15)) + (stars > 15 ? value.attack : 0);
    }
  } else {
    result.ATTACK_POWER = value.attack + (item.slot === "GLOVES" && (item.baseStats.ATTACK_POWER ?? 0) > 0 ? value.glovesAttack : 0);
    result.MAGIC_ATTACK = value.attack + (item.slot === "GLOVES" && (item.baseStats.MAGIC_ATTACK ?? 0) > 0 ? value.glovesAttack : 0);
  }
  if (item.slot === "SHOES") {
    result.SPEED = value.shoesSpeed;
    result.JUMP = value.shoesJump;
  }
  return Object.fromEntries(Object.entries(result).filter(([, amount]) => amount !== 0));
}

function normalValue(level: number, stars: number): StarForceValue | null {
  if (stars <= 15) return LOW_STAR_VALUES[stars] ?? null;
  const band = HIGH_STAR_BANDS.find((candidate) => candidate.min <= level && level <= candidate.max);
  const row = band?.rows[stars - 16];
  return row ? sfValue(row[0], row[1], row[2], 7, 18, 18) : null;
}

function weaponLowStarAttack(baseAttack: number, stars: number) {
  let current = baseAttack;
  for (let star = 0; star < stars; star++) current += Math.floor(current / 50) + 1;
  return current - baseAttack;
}

function scaledFivePercentBonus(base: number, stars: number) {
  let current = base;
  for (let star = 0; star < stars; star++) current = Math.ceil(current * 1.05);
  return current - base;
}

function receivesHpMpStarForce(slot: string) {
  return !["GLOVES", "SHOES", "FACE", "EYE"].includes(slot);
}
