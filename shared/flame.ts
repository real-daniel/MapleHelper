export type FlameMainStat = "STR" | "DEX" | "INT" | "LUK";
export type FlameEquipmentKind = "armor" | "weapon";

export type FlameWeights = {
  stats: Partial<Record<FlameMainStat, number>>;
  maxHp: number;
  allStat: number;
  attack: number;
  bossDamage: number;
  damage: number;
};

export type MesoFlameInput = {
  level: number;
  equipmentKind: FlameEquipmentKind;
  flameAdvantaged: boolean;
  baseAttack: number;
  magicAttack: boolean;
  weights: FlameWeights;
};

export type MesoFlameAnalysis = {
  currentScore: number;
  betterChance: number;
  expectedBetterScore: number;
  expectedGain: number;
  expectedResets: number;
  expectedCost: number;
};

export const MESO_FLAME_RESET_COST = 3_000_000;
export const BLACK_FLAME_RANK_RATES = [0.29, 0.45, 0.25, 0.01] as const;
const NORMAL_LINE_COUNT_RATES = [0.375, 0.375, 0.195, 0.055] as const;

const STAT_PAIRS: Array<[FlameMainStat, FlameMainStat]> = [
  ["STR", "DEX"], ["STR", "INT"], ["STR", "LUK"],
  ["DEX", "INT"], ["DEX", "LUK"], ["INT", "LUK"],
];

const NON_FLAME_ADVANTAGED_WEAPON_MULTIPLIERS = [
  [1.01, 1.022, 1.0363, 1.0532, 1.0732],
  [1.02, 1.044, 1.0726, 1.1065, 1.1464],
  [1.03, 1.066, 1.1089, 1.1597, 1.2196],
  [1.04, 1.088, 1.1452, 1.213, 1.2928],
  [1.05, 1.11, 1.1815, 1.2662, 1.366],
  [1.06, 1.132, 1.2178, 1.3194, 1.4392],
  [1.07, 1.154, 1.2541, 1.3727, 1.5124],
];

const FLAME_ADVANTAGED_WEAPON_MULTIPLIERS = [
  [1.03, 1.044, 1.0605, 1.0799, 1.1025],
  [1.06, 1.088, 1.121, 1.1597, 1.205],
  [1.09, 1.132, 1.1815, 1.2396, 1.3075],
  [1.12, 1.176, 1.242, 1.3194, 1.4099],
  [1.15, 1.22, 1.3025, 1.3993, 1.5124],
  [1.18, 1.264, 1.363, 1.4792, 1.6149],
  [1.21, 1.308, 1.4235, 1.559, 1.7174],
];

export function analyzeMesoFlame(input: MesoFlameInput, currentScore: number): MesoFlameAnalysis {
  const distribution = mesoFlameScoreDistribution(input);
  let betterChance = 0;
  let weightedBetterScore = 0;
  for (const [score, chance] of distribution) {
    if (score <= currentScore + 1e-9) continue;
    betterChance += chance;
    weightedBetterScore += score * chance;
  }
  const expectedBetterScore = betterChance > 0 ? weightedBetterScore / betterChance : currentScore;
  const expectedResets = betterChance > 0 ? 1 / betterChance : Infinity;
  return {
    currentScore,
    betterChance,
    expectedBetterScore,
    expectedGain: Math.max(0, expectedBetterScore - currentScore),
    expectedResets,
    expectedCost: expectedResets * MESO_FLAME_RESET_COST,
  };
}

export function mesoFlameChanceAtLeast(input: MesoFlameInput, targetScore: number) {
  let chance = 0;
  for (const [score, probability] of mesoFlameScoreDistribution(input)) {
    if (score + 1e-9 >= targetScore) chance += probability;
  }
  return chance;
}

export function mesoFlameScoreDistribution(input: MesoFlameInput): Map<number, number> {
  const categories = flameCategoryScores(input);
  const maxLines = 4;
  const selected = Array.from({ length: maxLines + 1 }, () => new Map<number, number>());
  selected[0].set(0, 1);

  for (const category of categories) {
    for (let lineCount = maxLines; lineCount >= 1; lineCount--) {
      const previous = selected[lineCount - 1];
      const next = selected[lineCount];
      for (const [score, subsetWeight] of previous) {
        for (let tierIndex = 0; tierIndex < BLACK_FLAME_RANK_RATES.length; tierIndex++) {
          const combined = roundedScore(score + category[tierIndex]);
          next.set(combined, (next.get(combined) ?? 0) + subsetWeight * BLACK_FLAME_RANK_RATES[tierIndex]);
        }
      }
    }
  }

  const result = new Map<number, number>();
  const lineCountRates = input.flameAdvantaged ? [0, 0, 0, 1] : NORMAL_LINE_COUNT_RATES;
  for (let lineCount = 1; lineCount <= maxLines; lineCount++) {
    const lineCountChance = lineCountRates[lineCount - 1];
    if (!lineCountChance) continue;
    const combinations = choose(categories.length, lineCount);
    for (const [score, subsetWeight] of selected[lineCount]) {
      const probability = subsetWeight / combinations * lineCountChance;
      result.set(score, (result.get(score) ?? 0) + probability);
    }
  }
  return result;
}

export function pureFlameStat(level: number, tier: number) {
  return Math.min(12, Math.floor(level / 20) + 1) * tier;
}

export function mixedFlameStat(level: number, tier: number) {
  return Math.min(7, Math.floor(level / 40) + 1) * tier;
}

export function flameHpMp(level: number, tier: number) {
  if (level < 10) return tier * 3;
  if (level >= 250) return tier * 700;
  if (level >= 200) return tier * (600 + Math.floor((level - 200) / 10) * 20);
  return tier * Math.floor(level / 10) * 30;
}

export function flameWeaponAttack(level: number, baseAttack: number, tier: number, flameAdvantaged: boolean) {
  const row = flameAdvantaged
    ? FLAME_ADVANTAGED_WEAPON_MULTIPLIERS[weaponLevelBand(level)]
    : NON_FLAME_ADVANTAGED_WEAPON_MULTIPLIERS[weaponLevelBand(level)];
  const index = flameAdvantaged ? tier - 3 : tier - 1;
  const multiplier = row[index];
  return multiplier == null ? 0 : Math.ceil(baseAttack * (multiplier - 1));
}

function flameCategoryScores(input: MesoFlameInput): number[][] {
  const tiers = input.flameAdvantaged ? [4, 5, 6, 7] : [2, 3, 4, 5];
  const scoreByTier = (value: (tier: number) => number) => tiers.map(value);
  const categories: number[][] = [];
  for (const stat of ["STR", "DEX", "INT", "LUK"] as const) {
    categories.push(scoreByTier((tier) => pureFlameStat(input.level, tier) * (input.weights.stats[stat] ?? 0)));
  }
  for (const [first, second] of STAT_PAIRS) {
    categories.push(scoreByTier((tier) => mixedFlameStat(input.level, tier) * ((input.weights.stats[first] ?? 0) + (input.weights.stats[second] ?? 0))));
  }
  categories.push(scoreByTier((tier) => flameHpMp(input.level, tier) * input.weights.maxHp)); // Max HP
  categories.push(scoreByTier(() => 0)); // Max MP
  categories.push(scoreByTier(() => 0)); // Reduced level requirement
  categories.push(scoreByTier(() => 0)); // Defense

  if (input.equipmentKind === "weapon") {
    categories.push(scoreByTier((tier) => input.magicAttack ? 0 : flameWeaponAttack(input.level, input.baseAttack, tier, input.flameAdvantaged) * input.weights.attack));
    categories.push(scoreByTier((tier) => input.magicAttack ? flameWeaponAttack(input.level, input.baseAttack, tier, input.flameAdvantaged) * input.weights.attack : 0));
    categories.push(scoreByTier((tier) => tier * 2 * input.weights.bossDamage));
    categories.push(scoreByTier((tier) => tier * input.weights.damage));
  } else {
    categories.push(scoreByTier((tier) => input.magicAttack ? 0 : tier * input.weights.attack)); // Attack
    categories.push(scoreByTier((tier) => input.magicAttack ? tier * input.weights.attack : 0)); // Magic Attack
    categories.push(scoreByTier(() => 0)); // Speed
    categories.push(scoreByTier(() => 0)); // Jump
  }
  categories.push(scoreByTier((tier) => tier * input.weights.allStat));
  return categories;
}

function weaponLevelBand(level: number) {
  if (level >= 250) return 6;
  return Math.min(5, Math.floor(level / 40));
}

function choose(total: number, selected: number) {
  let result = 1;
  for (let index = 1; index <= selected; index++) result = result * (total - selected + index) / index;
  return result;
}

function roundedScore(value: number) {
  return Math.round(value * 1e9) / 1e9;
}
