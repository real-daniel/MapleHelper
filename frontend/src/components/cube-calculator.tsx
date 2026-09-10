"use client";

import { useMemo, useState } from "react";
import { cubeRates } from "@/components/cube-rates";

type CubeType = "occult" | "master" | "meister" | "red" | "black";
type Tier = 0 | 1 | 2 | 3;
type ItemType = "accessory" | "badge" | "belt" | "bottom" | "cape" | "emblem" | "gloves" | "hat" | "heart" | "overall" | "top" | "secondary" | "shoes" | "shoulder" | "weapon";
type StatType = "normal" | "hp" | "allStat";
type Line = [string, number | string | string[], number];
type ProbabilityInput = Record<keyof typeof EMPTY_INPUT, number>;

const ITEM_LABELS: Record<ItemType, string> = {
  accessory: "Accessory",
  badge: "Badge",
  belt: "Belt",
  bottom: "Bottom",
  cape: "Cape",
  emblem: "Emblem",
  gloves: "Gloves",
  hat: "Hat",
  heart: "Heart",
  overall: "Overall",
  top: "Top",
  secondary: "Secondary",
  shoes: "Shoes",
  shoulder: "Shoulder",
  weapon: "Weapon",
};

const TIER_LABELS: Record<Tier, string> = {
  0: "Rare",
  1: "Epic",
  2: "Unique",
  3: "Legendary",
};

const CUBE_LABELS: Record<CubeType, string> = {
  occult: "Mystical / Occult",
  master: "Hard / Master",
  meister: "Solid / Meister",
  red: "Glowing / Red",
  black: "Bright / Black",
};

const STAT_TYPE_LABELS: Record<StatType, string> = {
  normal: "Normal",
  hp: "Max HP (Demon Avenger)",
  allStat: "All Stat (Xenon-style)",
};

const STAT_OPTION_INFO: Record<StatType, { statValueName: "Stat" | "Hp" | "AllStat"; displayText: string }> = {
  normal: { statValueName: "Stat", displayText: "Stat" },
  hp: { statValueName: "Hp", displayText: "Max HP" },
  allStat: { statValueName: "AllStat", displayText: "All Stat" },
};

const CUBE_COSTS: Record<CubeType, number> = {
  occult: 0,
  master: 7_500_000,
  meister: 0,
  red: 12_000_000,
  black: 22_000_000,
};

const MAX_CUBE_TIER: Record<CubeType, Tier> = {
  occult: 1,
  master: 2,
  meister: 3,
  red: 3,
  black: 3,
};

const TIER_RATES: Record<CubeType, Partial<Record<Tier, number>>> = {
  occult: { 0: 0.009901 },
  master: { 0: 0.1184, 1: 0.0381 },
  meister: { 0: 0.1163, 1: 0.0879, 2: 0.0459 },
  red: { 0: 0.14, 1: 0.06, 2: 0.025 },
  black: { 0: 0.17, 1: 0.11, 2: 0.05 },
};

const EMPTY_INPUT = {
  percStat: 0,
  lineStat: 0,
  percAllStat: 0,
  lineAllStat: 0,
  percHp: 0,
  lineHp: 0,
  percAtt: 0,
  lineAtt: 0,
  percBoss: 0,
  lineBoss: 0,
  lineIed: 0,
  lineCritDamage: 0,
  lineMeso: 0,
  lineDrop: 0,
  lineMesoOrDrop: 0,
  secCooldown: 0,
  lineAutoSteal: 0,
  lineAttOrBoss: 0,
  lineAttOrBossOrIed: 0,
  lineBossOrIed: 0,
};

const CATEGORY = {
  STR_PERC: "STR %",
  DEX_PERC: "DEX %",
  LUK_PERC: "LUK %",
  MAXHP_PERC: "Max HP %",
  ALLSTATS_PERC: "All Stats %",
  ATT_PERC: "ATT %",
  BOSSDMG_PERC: "Boss Damage",
  IED_PERC: "Ignore Enemy Defense %",
  MESO_PERC: "Meso Amount %",
  DROP_PERC: "Item Drop Rate %",
  AUTOSTEAL_PERC: "Chance to auto steal %",
  CRITDMG_PERC: "Critical Damage %",
  CDR_TIME: "Skill Cooldown Reduction",
  JUNK: "Junk",
  DECENT_SKILL: "Decent Skill",
  INVINCIBLE_PERC: "Chance of being invincible for seconds when hit",
  INVINCIBLE_TIME: "Increase invincibility time after being hit",
  IGNOREDMG_PERC: "Chance to ignore % damage when hit",
} as const;

const INPUT_CATEGORY_MAP: Record<keyof typeof EMPTY_INPUT, string[]> = {
  percStat: [CATEGORY.STR_PERC, CATEGORY.ALLSTATS_PERC],
  lineStat: [CATEGORY.STR_PERC, CATEGORY.ALLSTATS_PERC],
  percAllStat: [CATEGORY.ALLSTATS_PERC, CATEGORY.STR_PERC, CATEGORY.DEX_PERC, CATEGORY.LUK_PERC],
  lineAllStat: [CATEGORY.ALLSTATS_PERC],
  percHp: [CATEGORY.MAXHP_PERC],
  lineHp: [CATEGORY.MAXHP_PERC],
  percAtt: [CATEGORY.ATT_PERC],
  lineAtt: [CATEGORY.ATT_PERC],
  percBoss: [CATEGORY.BOSSDMG_PERC],
  lineBoss: [CATEGORY.BOSSDMG_PERC],
  lineIed: [CATEGORY.IED_PERC],
  lineCritDamage: [CATEGORY.CRITDMG_PERC],
  lineMeso: [CATEGORY.MESO_PERC],
  lineDrop: [CATEGORY.DROP_PERC],
  lineMesoOrDrop: [CATEGORY.DROP_PERC, CATEGORY.MESO_PERC],
  secCooldown: [CATEGORY.CDR_TIME],
  lineAutoSteal: [CATEGORY.AUTOSTEAL_PERC],
  lineAttOrBoss: [CATEGORY.ATT_PERC, CATEGORY.BOSSDMG_PERC],
  lineAttOrBossOrIed: [CATEGORY.ATT_PERC, CATEGORY.BOSSDMG_PERC, CATEGORY.IED_PERC],
  lineBossOrIed: [CATEGORY.BOSSDMG_PERC, CATEGORY.IED_PERC],
};

const MAX_CATEGORY_COUNT: Record<string, number> = {
  [CATEGORY.DECENT_SKILL]: 1,
  [CATEGORY.INVINCIBLE_TIME]: 1,
  [CATEGORY.IED_PERC]: 3,
  [CATEGORY.BOSSDMG_PERC]: 3,
  [CATEGORY.DROP_PERC]: 3,
  [CATEGORY.IGNOREDMG_PERC]: 2,
  [CATEGORY.INVINCIBLE_PERC]: 2,
};

const TIER_NUMBER_TO_TEXT: Record<Tier, string> = {
  0: "rare",
  1: "epic",
  2: "unique",
  3: "legendary",
};

function revealCost(itemLevel: number) {
  if (itemLevel < 30) return 0;
  if (itemLevel <= 70) return 0.5 * itemLevel ** 2;
  if (itemLevel <= 120) return 2.5 * itemLevel ** 2;
  return 20 * itemLevel ** 2;
}

function cubeCost(cubeType: CubeType, itemLevel: number, cubeCount: number) {
  return (CUBE_COSTS[cubeType] + revealCost(itemLevel)) * cubeCount;
}

function geometricQuantiles(probability: number) {
  if (probability <= 0) return { mean: Infinity, median: Infinity, p75: Infinity, p85: Infinity, p95: Infinity };
  if (probability >= 1) return { mean: 0, median: 0, p75: 0, p85: 0, p95: 0 };
  return {
    mean: 1 / probability,
    median: Math.log(1 - 0.5) / Math.log(1 - probability),
    p75: Math.log(1 - 0.75) / Math.log(1 - probability),
    p85: Math.log(1 - 0.85) / Math.log(1 - probability),
    p95: Math.log(1 - 0.95) / Math.log(1 - probability),
  };
}

function tierUpCubes(currentTier: Tier, desiredTier: Tier, cubeType: CubeType, doubleMiracleTime: boolean) {
  const total = { mean: 0, median: 0, p75: 0, p85: 0, p95: 0 };
  for (let tier = currentTier; tier < desiredTier; tier++) {
    let probability = TIER_RATES[cubeType][tier as Tier] ?? 0;
    if (doubleMiracleTime && (cubeType === "red" || cubeType === "black")) probability *= 2;
    const stats = geometricQuantiles(probability);
    total.mean += Math.round(stats.mean);
    total.median += Math.round(stats.median);
    total.p75 += Math.round(stats.p75);
    total.p85 += Math.round(stats.p85);
    total.p95 += Math.round(stats.p95);
  }
  return total;
}

function getPrimeLineValue(itemLevel: number, desiredTier: Tier, statType: StatType = "normal") {
  const levelBonus = itemLevel >= 160 ? 1 : 0;
  const base = statType === "allStat" ? 0 : 3;
  return base + 3 * desiredTier + levelBonus;
}

function get3LineAttackAmounts(prime: number) {
  return [prime * 3 - 6, prime * 3 - 3, prime * 3].filter((value) => value > 0);
}

function get3LineStatAmounts(prime: number) {
  return [prime * 3 - 18, prime * 3 - 15, prime * 3 - 12, prime * 3 - 9, ...get3LineAttackAmounts(prime)].filter((value) => value > 0);
}

function get2LineAttackAmounts(prime: number) {
  return [prime * 2 - 6, prime * 2 - 3, prime * 2];
}

function addAmountOptions(options: Array<{ group: string; label: string; value: string }>, group: string, field: string, displayText: string, amounts: number[]) {
  for (const amount of amounts) {
    options.push({ group, label: `${amount}%+ ${displayText}`, value: `${field}+${amount}` });
  }
}

function desiredStatOptions(itemType: ItemType, itemLevel: number, desiredTier: Tier, cubeType: CubeType, statType: StatType) {
  const options: Array<{ group: string; label: string; value: string }> = [{ group: "General", label: "Any", value: "any" }];
  const prime = getPrimeLineValue(itemLevel, desiredTier, statType);

  if (itemType === "weapon" || itemType === "secondary" || itemType === "emblem") {
    const attackAmounts = [...get2LineAttackAmounts(prime), ...get3LineAttackAmounts(prime)];
    addAmountOptions(options, "Attack", "percAtt", "Attack", attackAmounts);
    addAmountOptions(options, "Attack With 1 Line of IED", "lineIed+1&percAtt", "Attack and IED", get2LineAttackAmounts(prime));

    const showBoss = itemType !== "emblem" && desiredTier >= 2;
    const usefulText = `Attack% ${showBoss ? "or Boss% " : ""}or IED`;
    for (let lines = 1; lines <= 3; lines++) {
      options.push({ group: "Any Useful Lines", label: `${lines} Line ${usefulText}`, value: `lineAttOrBossOrIed+${lines}` });
    }
    options.push({ group: "Attack + Any Useful Lines", label: `1 Line attack with 1 Line ${usefulText}`, value: "lineAtt+1&lineAttOrBossOrIed+2" });
    options.push({ group: "Attack + Any Useful Lines", label: `1 Line attack with 2 Line ${usefulText}`, value: "lineAtt+1&lineAttOrBossOrIed+3" });
    options.push({ group: "Attack + Any Useful Lines", label: `2 Line attack with 1 Line ${usefulText}`, value: "lineAtt+2&lineAttOrBossOrIed+3" });

    if (itemType !== "emblem" && desiredTier >= 2) {
      const [, pn, pp] = get2LineAttackAmounts(prime);
      options.push({ group: "Attack and Boss Damage", label: "1 Line Attack% + 1 Line Boss%", value: "lineAtt+1&lineBoss+1" });
      options.push({ group: "Attack and Boss Damage", label: "1 Line Attack% + 2 Line Boss%", value: "lineAtt+1&lineBoss+2" });
      options.push({ group: "Attack and Boss Damage", label: "2 Line Attack% + 1 Line Boss%", value: "lineAtt+2&lineBoss+1" });
      options.push({ group: "Attack and Boss Damage", label: `${pn}%+ Attack and 30%+ Boss`, value: `percAtt+${pn}&percBoss+30` });
      if (desiredTier === 3) {
        options.push({ group: "Attack and Boss Damage", label: `${pn}%+ Attack and 35%+ Boss`, value: `percAtt+${pn}&percBoss+35` });
        options.push({ group: "Attack and Boss Damage", label: `${pn}%+ Attack and 40%+ Boss`, value: `percAtt+${pn}&percBoss+40` });
      }
      options.push({ group: "Attack and Boss Damage", label: `${pp}%+ Attack and 30%+ Boss`, value: `percAtt+${pp}&percBoss+30` });
      for (let lines = 1; lines <= 3; lines++) {
        options.push({ group: "Attack or Boss Damage", label: `${lines} Line Attack% or Boss%`, value: `lineAttOrBoss+${lines}` });
      }
    }
  } else {
    const info = STAT_OPTION_INFO[statType];
    const amounts = statType === "allStat" && desiredTier === 1 ? [1, 3, 4, 5, 6, 9] : get3LineStatAmounts(prime);
    addAmountOptions(options, "Stat", `perc${info.statValueName}`, info.displayText, amounts);
  }

  if (itemType === "gloves") {
    if (desiredTier === 3) {
      for (let lines = 1; lines <= 3; lines++) options.push({ group: "Crit Damage", label: `${lines} Line Crit Dmg%`, value: `lineCritDamage+${lines}` });
      const info = STAT_OPTION_INFO[statType];
      options.push({ group: "Crit Damage", label: `1 Line Crit Dmg% and 1 line ${info.displayText}`, value: `lineCritDamage+1&line${info.statValueName}+1` });
      options.push({ group: "Crit Damage", label: `1 Line Crit Dmg% and 2 line ${info.displayText}`, value: `lineCritDamage+1&line${info.statValueName}+2` });
      options.push({ group: "Crit Damage", label: `2 Line Crit Dmg% and 1 line ${info.displayText}`, value: `lineCritDamage+2&line${info.statValueName}+1` });
    }
    if (desiredTier >= 2 && (cubeType === "master" || cubeType === "meister")) {
      const info = STAT_OPTION_INFO[statType];
      for (let lines = 1; lines <= 3; lines++) options.push({ group: "Auto Steal", label: `${lines} Line Auto Steal%`, value: `lineAutoSteal+${lines}` });
      options.push({ group: "Auto Steal", label: `1 Line Auto Steal% and 1 line ${info.displayText}`, value: `lineAutoSteal+1&line${info.statValueName}+1` });
      options.push({ group: "Auto Steal", label: `1 Line Auto Steal% and 2 line ${info.displayText}`, value: `lineAutoSteal+1&line${info.statValueName}+2` });
      options.push({ group: "Auto Steal", label: `2 Line Auto Steal% and 1 line ${info.displayText}`, value: `lineAutoSteal+2&line${info.statValueName}+1` });
    }
  }

  if (itemType === "accessory" && desiredTier === 3) {
    const info = STAT_OPTION_INFO[statType];
    options.push({ group: "Drop/Meso", label: "1 Line Mesos Obtained%", value: "lineMeso+1" });
    options.push({ group: "Drop/Meso", label: "1 Line Item Drop%", value: "lineDrop+1" });
    options.push({ group: "Drop/Meso", label: "1 Line of Item Drop% or Mesos Obtained%", value: "lineMesoOrDrop+1" });
    options.push({ group: "Drop/Meso", label: "2 Line Mesos Obtained%", value: "lineMeso+2" });
    options.push({ group: "Drop/Meso", label: "2 Line Item Drop%", value: "lineDrop+2" });
    options.push({ group: "Drop/Meso", label: "2 Lines Involving Item Drop% or Mesos Obtained%", value: "lineMesoOrDrop+2" });
    options.push({ group: "Drop/Meso", label: "3 Line Mesos Obtained%", value: "lineMeso+3" });
    options.push({ group: "Drop/Meso", label: "3 Line Drop%", value: "lineDrop+3" });
    options.push({ group: "Drop/Meso", label: `1 Line Mesos Obtained% and 1 line ${info.displayText}`, value: `lineMeso+1&line${info.statValueName}+1` });
    options.push({ group: "Drop/Meso", label: `1 Line Item Drop% and 1 line ${info.displayText}`, value: `lineDrop+1&line${info.statValueName}+1` });
    options.push({ group: "Drop/Meso", label: `1 Line of Item Drop% or Mesos Obtained% with 1 line ${info.displayText}`, value: `lineMesoOrDrop+1&line${info.statValueName}+1` });
  }

  if (itemType === "hat" && desiredTier === 3) {
    const info = STAT_OPTION_INFO[statType];
    for (const seconds of [2, 3, 4, 5, 6]) options.push({ group: "Cooldown", label: `-${seconds}sec+ CD Reduction`, value: `secCooldown+${seconds}` });
    options.push({ group: "Cooldown", label: `-2sec+ CD Reduction and 1 Line ${info.displayText}`, value: `secCooldown+2&line${info.statValueName}+1` });
    options.push({ group: "Cooldown", label: `-2sec+ CD Reduction and 2 Line ${info.displayText}`, value: `secCooldown+2&line${info.statValueName}+2` });
    options.push({ group: "Cooldown", label: `-3sec+ CD Reduction and 1 Line ${info.displayText}`, value: `secCooldown+3&line${info.statValueName}+1` });
    options.push({ group: "Cooldown", label: `-4sec+ CD Reduction and 1 Line ${info.displayText}`, value: `secCooldown+4&line${info.statValueName}+1` });
  }

  return options;
}

function groupedOptions(options: Array<{ group: string; label: string; value: string }>) {
  return options.reduce<Record<string, Array<{ label: string; value: string }>>>((groups, option) => {
    groups[option.group] ??= [];
    groups[option.group].push({ label: option.label, value: option.value });
    return groups;
  }, {});
}

function translateInput(value: string): ProbabilityInput {
  const output = { ...EMPTY_INPUT };
  if (value === "any") return output;
  for (const part of value.split("&")) {
    const [field, amount] = part.split("+") as [keyof typeof EMPTY_INPUT, string];
    output[field] += Number(amount) || 0;
  }
  return output;
}

function convertItemType(itemType: ItemType) {
  if (itemType === "accessory") return "ring";
  if (itemType === "badge") return "heart";
  return itemType;
}

function isSpecialLine(category: string) {
  return Object.keys(MAX_CATEGORY_COUNT).includes(category);
}

function getUsefulCategories(input: ProbabilityInput) {
  const categories = new Set<string>();
  for (const [field, amount] of Object.entries(input) as Array<[keyof typeof EMPTY_INPUT, number]>) {
    if (amount > 0) for (const category of INPUT_CATEGORY_MAP[field]) categories.add(category);
  }
  return [...categories];
}

function getConsolidatedRates(ratesList: Line[], usefulCategories: string[]) {
  const consolidated: Line[] = [];
  let junkRate = 0;
  const junkCategories: string[] = [];

  for (const line of ratesList) {
    const [category, value, rate] = line;
    if (usefulCategories.includes(category) || isSpecialLine(category)) {
      consolidated.push(line);
    } else if (category === CATEGORY.JUNK) {
      junkRate += rate;
      if (Array.isArray(value)) junkCategories.push(...value);
      else junkCategories.push(String(value));
    } else {
      junkRate += rate;
      junkCategories.push(`${category} (${value})`);
    }
  }

  consolidated.push([CATEGORY.JUNK, junkCategories, junkRate]);
  return consolidated;
}

function calculateTotal(outcome: Line[], desiredCategory: string, byValue = false) {
  return outcome.reduce((sum, [category, value]) => {
    if (category !== desiredCategory) return sum;
    return sum + (byValue && typeof value === "number" ? value : 1);
  }, 0);
}

function checkPercAllStat(outcome: Line[], required: number) {
  let actual = 0;
  for (const [category, value] of outcome) {
    if (typeof value !== "number") continue;
    if (category === CATEGORY.ALLSTATS_PERC) actual += value;
    else if (([CATEGORY.STR_PERC, CATEGORY.DEX_PERC, CATEGORY.LUK_PERC] as string[]).includes(category)) actual += value / 3;
  }
  return actual >= required;
}

function satisfiesInput(outcome: Line[], input: ProbabilityInput) {
  return Object.entries(input).every(([field, required]) => {
    if (required <= 0) return true;
    switch (field) {
      case "percStat": return calculateTotal(outcome, CATEGORY.STR_PERC, true) + calculateTotal(outcome, CATEGORY.ALLSTATS_PERC, true) >= required;
      case "lineStat": return calculateTotal(outcome, CATEGORY.STR_PERC) + calculateTotal(outcome, CATEGORY.ALLSTATS_PERC) >= required;
      case "percAllStat": return checkPercAllStat(outcome, required);
      case "lineAllStat": return calculateTotal(outcome, CATEGORY.ALLSTATS_PERC) >= required;
      case "percHp": return calculateTotal(outcome, CATEGORY.MAXHP_PERC, true) >= required;
      case "lineHp": return calculateTotal(outcome, CATEGORY.MAXHP_PERC) >= required;
      case "percAtt": return calculateTotal(outcome, CATEGORY.ATT_PERC, true) >= required;
      case "lineAtt": return calculateTotal(outcome, CATEGORY.ATT_PERC) >= required;
      case "percBoss": return calculateTotal(outcome, CATEGORY.BOSSDMG_PERC, true) >= required;
      case "lineBoss": return calculateTotal(outcome, CATEGORY.BOSSDMG_PERC) >= required;
      case "lineIed": return calculateTotal(outcome, CATEGORY.IED_PERC) >= required;
      case "lineCritDamage": return calculateTotal(outcome, CATEGORY.CRITDMG_PERC) >= required;
      case "lineMeso": return calculateTotal(outcome, CATEGORY.MESO_PERC) >= required;
      case "lineDrop": return calculateTotal(outcome, CATEGORY.DROP_PERC) >= required;
      case "lineMesoOrDrop": return calculateTotal(outcome, CATEGORY.MESO_PERC) + calculateTotal(outcome, CATEGORY.DROP_PERC) >= required;
      case "secCooldown": return calculateTotal(outcome, CATEGORY.CDR_TIME, true) >= required;
      case "lineAutoSteal": return calculateTotal(outcome, CATEGORY.AUTOSTEAL_PERC) >= required;
      case "lineAttOrBoss": return calculateTotal(outcome, CATEGORY.ATT_PERC) + calculateTotal(outcome, CATEGORY.BOSSDMG_PERC) >= required;
      case "lineAttOrBossOrIed": return calculateTotal(outcome, CATEGORY.ATT_PERC) + calculateTotal(outcome, CATEGORY.BOSSDMG_PERC) + calculateTotal(outcome, CATEGORY.IED_PERC) >= required;
      case "lineBossOrIed": return calculateTotal(outcome, CATEGORY.BOSSDMG_PERC) + calculateTotal(outcome, CATEGORY.IED_PERC) >= required;
      default: return true;
    }
  });
}

function adjustedRate(currentLine: Line, previousLines: Line[], currentPool: Line[]) {
  const currentCategory = currentLine[0];
  const previousCounts: Record<string, number> = {};

  for (const [category] of previousLines) {
    if (isSpecialLine(category)) previousCounts[category] = (previousCounts[category] ?? 0) + 1;
  }

  const removed: string[] = [];
  for (const [category, count] of Object.entries(previousCounts)) {
    if (count > MAX_CATEGORY_COUNT[category] || (category === currentCategory && count + 1 > MAX_CATEGORY_COUNT[category])) return 0;
    if (count === MAX_CATEGORY_COUNT[category]) removed.push(category);
  }

  let adjustedTotal = 100;
  for (const [category, , rate] of currentPool) {
    if (removed.includes(category)) adjustedTotal -= rate;
  }

  return adjustedTotal === 100 ? currentLine[2] : currentLine[2] / adjustedTotal * 100;
}

function calculateOutcomeRate(outcome: Line[], filteredRates: { first_line: Line[]; second_line: Line[]; third_line: Line[] }) {
  const rates = [
    adjustedRate(outcome[0], [], filteredRates.first_line),
    adjustedRate(outcome[1], [outcome[0]], filteredRates.second_line),
    adjustedRate(outcome[2], [outcome[0], outcome[1]], filteredRates.third_line),
  ];
  return rates.reduce((chance, rate) => chance * (rate / 100), 100);
}

function adjustCubeDataForLevel(cubeData: { first_line: Line[]; second_line: Line[]; third_line: Line[] }, itemLevel: number) {
  if (itemLevel < 160) return cubeData;
  const affected = new Set([CATEGORY.STR_PERC, CATEGORY.LUK_PERC, CATEGORY.DEX_PERC, CATEGORY.ALLSTATS_PERC, CATEGORY.ATT_PERC, CATEGORY.MAXHP_PERC, "INT %", "MATT %"]);
  const adjustLine = ([category, value, rate]: Line): Line => [category, affected.has(category) && typeof value === "number" ? value + 1 : value, rate];
  return {
    first_line: cubeData.first_line.map(adjustLine),
    second_line: cubeData.second_line.map(adjustLine),
    third_line: cubeData.third_line.map(adjustLine),
  };
}

function getProbability(desiredTier: Tier, probabilityInput: ProbabilityInput, itemType: ItemType, cubeType: CubeType, itemLevel: number) {
  if (Object.values(probabilityInput).every((value) => value === 0)) return 1;

  const tier = TIER_NUMBER_TO_TEXT[desiredTier];
  const itemLabel = convertItemType(itemType);
  const source = cubeRates.lvl120to200[itemLabel]?.[cubeType]?.[tier];
  if (!source) return 0;

  const cubeData = adjustCubeDataForLevel({
    first_line: source.first_line as Line[],
    second_line: source.second_line as Line[],
    third_line: source.third_line as Line[],
  }, itemLevel);

  const usefulCategories = getUsefulCategories(probabilityInput);
  const consolidated = {
    first_line: getConsolidatedRates(cubeData.first_line, usefulCategories),
    second_line: getConsolidatedRates(cubeData.second_line, usefulCategories),
    third_line: getConsolidatedRates(cubeData.third_line, usefulCategories),
  };

  let totalChance = 0;
  for (const line1 of consolidated.first_line) {
    for (const line2 of consolidated.second_line) {
      for (const line3 of consolidated.third_line) {
        const outcome = [line1, line2, line3];
        if (satisfiesInput(outcome, probabilityInput)) totalChance += calculateOutcomeRate(outcome, consolidated);
      }
    }
  }

  return totalChance / 100;
}

function formatMeso(value: number) {
  if (!Number.isFinite(value)) return "Not possible";
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}t`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}b`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}m`;
  return Math.round(value).toLocaleString();
}

function formatCount(value: number) {
  return Number.isFinite(value) ? Math.round(value).toLocaleString() : "Not possible";
}

export function CubeCalculator() {
  const [itemType, setItemType] = useState<ItemType>("accessory");
  const [cubeType, setCubeType] = useState<CubeType>("red");
  const [itemLevel, setItemLevel] = useState(150);
  const [currentTier, setCurrentTier] = useState<Tier>(3);
  const [desiredTier, setDesiredTier] = useState<Tier>(3);
  const [statType, setStatType] = useState<StatType>("normal");
  const [desiredStat, setDesiredStat] = useState("percStat+21");
  const [doubleMiracleTime, setDoubleMiracleTime] = useState(false);

  const maxTier = MAX_CUBE_TIER[cubeType];
  const boundedCurrentTier = Math.min(currentTier, maxTier) as Tier;
  const boundedDesiredTier = Math.min(Math.max(desiredTier, boundedCurrentTier), maxTier) as Tier;
  const canPickStat = boundedCurrentTier === boundedDesiredTier && maxTier === boundedDesiredTier;
  const options = useMemo(
    () => canPickStat ? desiredStatOptions(itemType, itemLevel, boundedDesiredTier, cubeType, statType) : [{ group: "General", label: "Any", value: "any" }],
    [boundedDesiredTier, canPickStat, cubeType, itemLevel, itemType, statType],
  );
  const selectedDesiredStat = options.some((option) => option.value === desiredStat) ? desiredStat : options[0].value;

  const result = useMemo(() => {
    const probability = selectedDesiredStat === "any" ? 1 : getProbability(boundedDesiredTier, translateInput(selectedDesiredStat), itemType, cubeType, itemLevel);
    const statCubes = geometricQuantiles(probability);
    const tierCubes = boundedCurrentTier < boundedDesiredTier ? tierUpCubes(boundedCurrentTier, boundedDesiredTier, cubeType, doubleMiracleTime) : { mean: 0, median: 0, p75: 0, p85: 0, p95: 0 };
    const cubes = {
      mean: Math.round(statCubes.mean) + tierCubes.mean,
      median: Math.round(statCubes.median) + tierCubes.median,
      p75: Math.round(statCubes.p75) + tierCubes.p75,
      p85: Math.round(statCubes.p85) + tierCubes.p85,
      p95: Math.round(statCubes.p95) + tierCubes.p95,
    };
    return {
      probability,
      cubes,
      costs: {
        mean: cubeCost(cubeType, itemLevel, cubes.mean),
        median: cubeCost(cubeType, itemLevel, cubes.median),
        p75: cubeCost(cubeType, itemLevel, cubes.p75),
        p85: cubeCost(cubeType, itemLevel, cubes.p85),
        p95: cubeCost(cubeType, itemLevel, cubes.p95),
      },
      costPerCube: cubeCost(cubeType, itemLevel, 1),
    };
  }, [boundedCurrentTier, boundedDesiredTier, cubeType, doubleMiracleTime, itemLevel, itemType, selectedDesiredStat]);

  const grouped = groupedOptions(options);

  return (
    <main>
      <h1>Cube Calculator</h1>

      <section>
        <h2>Cubing information</h2>
        <div className="field-grid">
          <label>Item category
            <select value={itemType} onChange={(event) => setItemType(event.target.value as ItemType)}>
              {Object.entries(ITEM_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>Cube type
            <select value={cubeType} onChange={(event) => {
              const nextCube = event.target.value as CubeType;
              setCubeType(nextCube);
              setCurrentTier((tier) => Math.min(tier, MAX_CUBE_TIER[nextCube]) as Tier);
              setDesiredTier((tier) => Math.min(tier, MAX_CUBE_TIER[nextCube]) as Tier);
            }}>
              {Object.entries(CUBE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>Current tier
            <select value={boundedCurrentTier} onChange={(event) => {
              const tier = Number(event.target.value) as Tier;
              setCurrentTier(tier);
              setDesiredTier((desired) => Math.max(desired, tier) as Tier);
            }}>
              {([0, 1, 2, 3] as Tier[]).filter((tier) => tier <= maxTier).map((tier) => <option key={tier} value={tier}>{TIER_LABELS[tier]}</option>)}
            </select>
          </label>
          <label>Item level
            <input type="number" min={71} max={300} value={itemLevel} onChange={(event) => setItemLevel(Math.min(300, Math.max(71, Number(event.target.value) || 71)))} />
          </label>
          <label>Desired tier
            <select value={boundedDesiredTier} onChange={(event) => setDesiredTier(Number(event.target.value) as Tier)}>
              {([0, 1, 2, 3] as Tier[]).filter((tier) => tier >= boundedCurrentTier && tier <= maxTier).map((tier) => <option key={tier} value={tier}>{TIER_LABELS[tier]}</option>)}
            </select>
          </label>
          <label>Stat type
            <select value={statType} onChange={(event) => setStatType(event.target.value as StatType)}>
              {Object.entries(STAT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>Desired stat
            <select value={selectedDesiredStat} disabled={!canPickStat} onChange={(event) => setDesiredStat(event.target.value)}>
              {Object.entries(grouped).map(([group, groupOptions]) => (
                <optgroup key={group} label={group}>
                  {groupOptions.map((option) => <option key={`${group}-${option.value}-${option.label}`} value={option.value}>{option.label}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
        <label className="checkbox-label">
          <input type="checkbox" checked={doubleMiracleTime} onChange={(event) => setDoubleMiracleTime(event.target.checked)} />
          Double Miracle Time
        </label>
        {!canPickStat && <p className="muted">Desired stat is set to Any while tiering up, matching the reference calculator behavior.</p>}
      </section>

      <section>
        <h2>Mesos stats</h2>
        <dl>
          <dt>Average cost</dt><dd>{Math.round(result.costs.mean).toLocaleString()} ({formatMeso(result.costs.mean)})</dd>
          <dt>Median cost</dt><dd>{Math.round(result.costs.median).toLocaleString()} ({formatMeso(result.costs.median)})</dd>
          <dt>Cost per cube</dt><dd>{Math.round(result.costPerCube).toLocaleString()} ({formatMeso(result.costPerCube)})</dd>
        </dl>
      </section>

      <section>
        <h2>Mesos percentiles</h2>
        <dl>
          <dt>75% chance within</dt><dd>{Math.round(result.costs.p75).toLocaleString()} ({formatMeso(result.costs.p75)})</dd>
          <dt>85% chance within</dt><dd>{Math.round(result.costs.p85).toLocaleString()} ({formatMeso(result.costs.p85)})</dd>
          <dt>95% chance within</dt><dd>{Math.round(result.costs.p95).toLocaleString()} ({formatMeso(result.costs.p95)})</dd>
        </dl>
      </section>

      <section>
        <h2>Cube stats</h2>
        <dl>
          <dt>Chance per cube</dt><dd>{(result.probability * 100).toFixed(4)}%</dd>
          <dt>Average cubes</dt><dd>{formatCount(result.cubes.mean)}</dd>
          <dt>Median cubes</dt><dd>{formatCount(result.cubes.median)}</dd>
        </dl>
      </section>

      <section>
        <h2>Cube percentiles</h2>
        <dl>
          <dt>75% chance within</dt><dd>{formatCount(result.cubes.p75)}</dd>
          <dt>85% chance within</dt><dd>{formatCount(result.cubes.p85)}</dd>
          <dt>95% chance within</dt><dd>{formatCount(result.cubes.p95)}</dd>
        </dl>
      </section>
    </main>
  );
}
