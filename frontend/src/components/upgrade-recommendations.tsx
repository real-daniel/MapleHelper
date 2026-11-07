"use client";

import { useEffect, useMemo, useState } from "react";
import { cubeRates } from "./cube-rates";
import { isBlackHeart, itemStarForceCap, supportsFlames, supportsItemPotential } from "./equipment-rules";
import { equipmentJobGroup } from "./equipment-names";
import type { EquipmentItem, EquipmentSlot } from "./equipment-manager";
import {
  loadStarForceSettings,
  STAR_FORCE_SETTINGS_EVENT,
  type StarForceSettings,
} from "./star-force-settings";
import { starForceBonuses, type StarForceStat } from "../../../shared/star-force";
import { analyzeMesoFlame, type FlameWeights } from "../../../shared/flame";

type MainStat = "STR" | "DEX" | "INT" | "LUK";
type CubeTier = "rare" | "epic" | "unique" | "legendary";
type CubeTierNumber = 0 | 1 | 2 | 3;
type RecommendationCubeType = "red" | "black";
type CubeItemType = "accessory" | "badge" | "belt" | "bottom" | "cape" | "emblem" | "gloves" | "hat" | "heart" | "overall" | "top" | "secondary" | "shoes" | "shoulder" | "weapon";
type UpgradeKind = "Star Force" | "Cubing" | "Flaming";
type UpgradeCategory = "All" | UpgradeKind;

type Recommendation = {
  id: string;
  kind: UpgradeKind;
  item: EquipmentItem;
  action: string;
  expectedCost: number;
  damageGain: number;
  efficiency: number;
  notes: string;
};

type PotentialBenchmark = {
  label: string;
  description: string;
  value: number;
  difficulty: number;
  probabilityInput: ProbabilityInput;
  cubeType: RecommendationCubeType;
};

type CubeLine = [string, number | string | string[], number];
type ProbabilityInput = Record<keyof typeof EMPTY_CUBE_INPUT, number>;

const SAMPLE_EQUIVALENCIES = `Boss Damage 40 3.628%
Attack 30 0.606%
Attack% 12 4.827%
Critical Dmg 8 2.462%
Ignore Dff(300) 40 1.067%
Ignore Dff(380) 40 1.361%
STR 30 0.235%
STR% 12 1.060%
All Stat% 9 0.907%`;

const CUBE_TIER_ORDER: CubeTier[] = ["rare", "epic", "unique", "legendary"];
const CUBE_TIER_NUMBER: Record<CubeTier, CubeTierNumber> = { rare: 0, epic: 1, unique: 2, legendary: 3 };
const TIER_UP_RATE: Record<RecommendationCubeType, Record<CubeTier, number>> = {
  red: { rare: 0.14, epic: 0.06, unique: 0.025, legendary: 0 },
  black: { rare: 0.17, epic: 0.11, unique: 0.05, legendary: 0 },
};
const CUBE_COSTS: Record<RecommendationCubeType, number> = { red: 12_000_000, black: 22_000_000 };

const EMPTY_CUBE_INPUT = {
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

const CUBE_CATEGORY = {
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

const CUBE_INPUT_CATEGORY_MAP: Record<keyof typeof EMPTY_CUBE_INPUT, string[]> = {
  percStat: [CUBE_CATEGORY.STR_PERC, CUBE_CATEGORY.ALLSTATS_PERC],
  lineStat: [CUBE_CATEGORY.STR_PERC, CUBE_CATEGORY.ALLSTATS_PERC],
  percAllStat: [CUBE_CATEGORY.ALLSTATS_PERC, CUBE_CATEGORY.STR_PERC, CUBE_CATEGORY.DEX_PERC, CUBE_CATEGORY.LUK_PERC],
  lineAllStat: [CUBE_CATEGORY.ALLSTATS_PERC],
  percHp: [CUBE_CATEGORY.MAXHP_PERC],
  lineHp: [CUBE_CATEGORY.MAXHP_PERC],
  percAtt: [CUBE_CATEGORY.ATT_PERC],
  lineAtt: [CUBE_CATEGORY.ATT_PERC],
  percBoss: [CUBE_CATEGORY.BOSSDMG_PERC],
  lineBoss: [CUBE_CATEGORY.BOSSDMG_PERC],
  lineIed: [CUBE_CATEGORY.IED_PERC],
  lineCritDamage: [CUBE_CATEGORY.CRITDMG_PERC],
  lineMeso: [CUBE_CATEGORY.MESO_PERC],
  lineDrop: [CUBE_CATEGORY.DROP_PERC],
  lineMesoOrDrop: [CUBE_CATEGORY.DROP_PERC, CUBE_CATEGORY.MESO_PERC],
  secCooldown: [CUBE_CATEGORY.CDR_TIME],
  lineAutoSteal: [CUBE_CATEGORY.AUTOSTEAL_PERC],
  lineAttOrBoss: [CUBE_CATEGORY.ATT_PERC, CUBE_CATEGORY.BOSSDMG_PERC],
  lineAttOrBossOrIed: [CUBE_CATEGORY.ATT_PERC, CUBE_CATEGORY.BOSSDMG_PERC, CUBE_CATEGORY.IED_PERC],
  lineBossOrIed: [CUBE_CATEGORY.BOSSDMG_PERC, CUBE_CATEGORY.IED_PERC],
};

const MAX_CUBE_CATEGORY_COUNT: Record<string, number> = {
  [CUBE_CATEGORY.DECENT_SKILL]: 1,
  [CUBE_CATEGORY.INVINCIBLE_TIME]: 1,
  [CUBE_CATEGORY.IED_PERC]: 3,
  [CUBE_CATEGORY.BOSSDMG_PERC]: 3,
  [CUBE_CATEGORY.DROP_PERC]: 3,
  [CUBE_CATEGORY.IGNOREDMG_PERC]: 2,
  [CUBE_CATEGORY.INVINCIBLE_PERC]: 2,
};

const UPGRADE_CATEGORIES: UpgradeCategory[] = ["All", "Star Force", "Flaming", "Cubing"];

export function UpgradeRecommendations({ equipment, selectedProfileId, characterJob }: { equipment: EquipmentItem[]; selectedProfileId: string; characterJob: string }) {
  const [mainStat, setMainStat] = useState<MainStat>(() => mainStatForJob(characterJob));
  const [equivalencyText, setEquivalencyText] = useState(SAMPLE_EQUIVALENCIES);
  const [starForceSettings, setStarForceSettings] = useState<StarForceSettings>(() => loadStarForceSettings());
  const [category, setCategory] = useState<UpgradeCategory>("All");

  useEffect(() => {
    const syncSettings = () => setStarForceSettings(loadStarForceSettings());
    window.addEventListener("storage", syncSettings);
    window.addEventListener(STAR_FORCE_SETTINGS_EVENT, syncSettings);
    return () => {
      window.removeEventListener("storage", syncSettings);
      window.removeEventListener(STAR_FORCE_SETTINGS_EVENT, syncSettings);
    };
  }, []);

  const equivalencies = useMemo(() => parseEquivalencies(equivalencyText), [equivalencyText]);
  const recommendations = useMemo(
    () => buildRecommendations(equipment, mainStat, equivalencies, starForceSettings, characterJob),
    [characterJob, equipment, equivalencies, mainStat, starForceSettings],
  );
  const filteredRecommendations = useMemo(
    () => recommendationsForCategory(recommendations, category),
    [category, recommendations],
  );
  const visibleRecommendations = useMemo(
    () => visibleRecommendationRows(filteredRecommendations, category === "All"),
    [category, filteredRecommendations],
  );

  return (
    <section>
      <div className="section-heading">
        <h2>Next upgrade recommendations</h2>
        <span className="muted">{selectedProfileId ? `${equipment.length} saved item(s)` : "Select a profile first"}</span>
      </div>
      <p className="muted">Preliminary model: Star Force, main potential, and GMS meso flame resets. Bonus potential is intentionally excluded.</p>

      <div className="field-grid">
        <label>
          Main stat
          <select value={mainStat} onChange={(event) => setMainStat(event.target.value as MainStat)}>
            <option value="STR">STR</option>
            <option value="DEX">DEX</option>
            <option value="INT">INT</option>
            <option value="LUK">LUK</option>
          </select>
        </label>
        <label className="full-width-field">
          Stat equivalencies
          <textarea value={equivalencyText} onChange={(event) => setEquivalencyText(event.target.value)} />
        </label>
      </div>

      {recommendations.length === 0 ? (
        <p className="muted">Save starrable or cubeable equipment with stat equivalencies to rank upgrades.</p>
      ) : (
        <>
          <div className="recommendation-toolbar">
            <span className="muted">Category</span>
            <div className="segmented" role="group" aria-label="Upgrade recommendation category">
              {UPGRADE_CATEGORIES.map((option) => {
                const count = option === "All" ? recommendations.length : recommendations.filter((recommendation) => recommendation.kind === option).length;
                return <button key={option} type="button" aria-pressed={category === option} onClick={() => setCategory(option)}>{option} ({count})</button>;
              })}
            </div>
          </div>
          {filteredRecommendations.length === 0 ? (
            <p className="muted">No {category.toLowerCase()} recommendations for the current equipment.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th><th>Category</th><th>Upgrade</th><th>Item</th><th>Gain</th><th>Expected cost</th><th>Efficiency</th><th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRecommendations.map(({ recommendation, rank }) => (
                    <tr key={recommendation.id}>
                      <td>{rank}</td>
                      <td>{recommendation.kind}</td>
                      <td>{recommendation.action}</td>
                      <td>{recommendation.item.name}</td>
                      <td>{recommendation.damageGain.toFixed(4)}% FD</td>
                      <td>{formatMeso(recommendation.expectedCost)}</td>
                      <td>{recommendation.efficiency.toFixed(4)}% FD / b</td>
                      <td>{recommendation.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function buildRecommendations(
  equipment: EquipmentItem[],
  mainStat: MainStat,
  equivalencies: Map<string, number>,
  starForceSettings: StarForceSettings,
  characterJob: string,
) {
  return equipment
    .flatMap((item) => [
      starForceRecommendation(item, mainStat, equivalencies, starForceSettings, characterJob),
      cubingRecommendation(item, mainStat, equivalencies),
      flameRecommendation(item, mainStat, equivalencies),
    ])
    .filter((candidate): candidate is Recommendation => candidate != null && Number.isFinite(candidate.efficiency))
    .sort((left, right) => right.efficiency - left.efficiency);
}

export function recommendationsForCategory(recommendations: Recommendation[], category: UpgradeCategory) {
  return category === "All" ? recommendations : recommendations.filter((recommendation) => recommendation.kind === category);
}

function visibleRecommendationRows(recommendations: Recommendation[], ensureStarForce = true) {
  const topRows = recommendations.slice(0, 12).map((recommendation, index) => ({ recommendation, rank: index + 1 }));
  if (!ensureStarForce || topRows.some(({ recommendation }) => recommendation.kind === "Star Force")) {
    return topRows;
  }

  const firstStarForceIndex = recommendations.findIndex((recommendation) => recommendation.kind === "Star Force");
  if (firstStarForceIndex < 0) {
    return topRows;
  }

  return [
    ...topRows,
    { recommendation: recommendations[firstStarForceIndex], rank: firstStarForceIndex + 1 },
  ];
}

export function mainStatForJob(jobName: string): MainStat {
  const normalized = jobName.trim().toLowerCase();
  if (["corsair", "captain", "mechanic", "angelic buster", "jett", "xenon"].some((job) => normalized.includes(job))) return "DEX";
  const group = equipmentJobGroup(jobName);
  if (group === "Magician") return "INT";
  if (group === "Bowman") return "DEX";
  if (group === "Thief") return "LUK";
  return "STR";
}

function starForceBaseStats(baseStats: Record<string, number> | null): Partial<Record<StarForceStat, number>> {
  const labels: Record<string, StarForceStat> = {
    STR: "STR", DEX: "DEX", INT: "INT", LUK: "LUK", "Max HP": "MAX_HP", "Max MP": "MAX_MP",
    "Attack Power": "ATTACK_POWER", "Magic Attack": "MAGIC_ATTACK", Defense: "DEFENSE", Speed: "SPEED", Jump: "JUMP",
  };
  const result: Partial<Record<StarForceStat, number>> = {};
  for (const [label, amount] of Object.entries(baseStats ?? {})) {
    const stat = labels[label];
    if (stat && Number.isFinite(amount)) result[stat] = amount;
  }
  return result;
}

function hasProtectedUtilityPotential(lines: string) {
  return /cooldown|item drop|meso (?:amount|obtained)|auto steal/i.test(lines);
}

function starForceRecommendation(
  item: EquipmentItem,
  mainStat: MainStat,
  equivalencies: Map<string, number>,
  settings: StarForceSettings,
  characterJob: string,
) {
  const level = item.levelRequirement ?? 0;
  const current = item.starForce ?? 0;
  const cap = itemStarForceCap(item.slot, item.name, item.levelRequirement, item.catalogStarForceProfile, item.astraStage, characterJob, item.destinyStage);
  if (level <= 0 || cap <= 0 || current >= cap) return null;

  const facts = {
    name: item.name,
    slot: item.slot,
    levelRequirement: item.levelRequirement,
    starForceProfile: item.catalogStarForceProfile,
    baseStats: starForceBaseStats(item.catalogBaseStats),
  };
  const currentStats = starForceBonuses(facts, current);
  const nextStats = starForceBonuses(facts, current + 1);
  const attackStat: StarForceStat = mainStat === "INT" ? "MAGIC_ATTACK" : "ATTACK_POWER";
  const statGain = Math.max(0, (nextStats[mainStat] ?? 0) - (currentStats[mainStat] ?? 0));
  const attackGain = Math.max(0, (nextStats[attackStat] ?? 0) - (currentStats[attackStat] ?? 0));
  const damageGain = statGain * (equivalencies.get(mainStat) ?? 0) + attackGain * (equivalencies.get("Attack") ?? 0);
  const expectedCost = expectedStarCost(level, current, current + 1, settings);
  if (damageGain <= 0 || expectedCost <= 0) return null;

  return {
    id: `sf-${item.id}-${current}`,
    kind: "Star Force" as const,
    item,
    action: `${current} star to ${current + 1} star`,
    expectedCost,
    damageGain,
    efficiency: damageGain / (expectedCost / 1_000_000_000),
    notes: `+${statGain} ${mainStat}, +${attackGain} Attack. Uses current Star Force calculator preset.`,
  };
}

function cubingRecommendation(item: EquipmentItem, mainStat: MainStat, equivalencies: Map<string, number>) {
  if (!supportsItemPotential(item.slot, item.name) || isBlackHeart(item.slot, item.name) || hasProtectedUtilityPotential(item.potentialLines)) return null;

  const tier = parseTier(item.potentialTier);
  const currentDamage = potentialDamage(item.potentialLines, mainStat, equivalencies, item.slot);
  const itemLevel = item.levelRequirement ?? 150;
  const selection = selectCubingTarget(item, tier, itemLevel, currentDamage, mainStat, equivalencies);
  if (!selection) return null;

  const { target, targetTier } = selection;
  const targetDamage = target.value;
  const damageGain = Math.max(0, targetDamage - currentDamage);
  if (damageGain <= 0) return null;

  const tierUpCost = targetTier === tier ? 0 : expectedTierUpCost(tier, targetTier, itemLevel);
  const rerollCost = expectedRerollCost(target.probabilityInput, targetTier, itemLevel, item.slot, target.cubeType);
  const expectedCost = tierUpCost + rerollCost;
  if (expectedCost <= 0) return null;

  return {
    id: `cube-${item.id}-${tier}-${targetTier}-${target.label}`,
    kind: "Cubing" as const,
    item,
    action: targetTier === tier ? `reroll toward ${target.label}` : `${title(tier)} to ${title(targetTier)} / ${target.label}`,
    expectedCost,
    damageGain,
    efficiency: damageGain / (expectedCost / 1_000_000_000),
    notes: `${targetTier === tier ? "" : "Bright cubes for tier-up, "}${target.cubeType === "black" ? "Bright" : "Red"} cubes for reroll. Benchmark step: ${target.description}.`,
  };
}

function flameRecommendation(item: EquipmentItem, mainStat: MainStat, equivalencies: Map<string, number>) {
  if (!supportsFlames(item.slot, item.name) || /sweetwater/i.test(item.name) || item.levelRequirement == null) return null;
  const weights: FlameWeights = {
    stats: { [mainStat]: equivalencies.get(mainStat) ?? 0 },
    allStat: equivalencies.get("All Stat%") ?? 0,
    attack: equivalencies.get("Attack") ?? 0,
    bossDamage: equivalencies.get("Boss Damage") ?? 0,
    damage: equivalencies.get("Damage") ?? 0,
  };
  if (Object.values(weights.stats).every((weight) => !weight) && !weights.allStat && !weights.attack && !weights.bossDamage && !weights.damage) return null;

  const magicAttack = mainStat === "INT";
  const analysis = analyzeMesoFlame({
    level: item.levelRequirement,
    equipmentKind: item.slot === "WEAPON" ? "weapon" : "armor",
    flameAdvantaged: isFlameAdvantaged(item),
    baseAttack: item.catalogBaseStats?.[magicAttack ? "Magic Attack" : "Attack Power"] ?? 0,
    magicAttack,
    weights,
  }, currentFlameDamage(item.flameStats, mainStat, equivalencies));
  if (analysis.betterChance <= 0 || analysis.expectedGain <= 0 || !Number.isFinite(analysis.expectedCost)) return null;

  return {
    id: `flame-${item.id}-${analysis.currentScore.toFixed(6)}`,
    kind: "Flaming" as const,
    item,
    action: "meso reset until better",
    expectedCost: analysis.expectedCost,
    damageGain: analysis.expectedGain,
    efficiency: analysis.expectedGain / (analysis.expectedCost / 1_000_000_000),
    notes: `${(analysis.betterChance * 100).toFixed(2)}% chance per 3m reset; keep the old result unless the new flame is better.`,
  };
}

function currentFlameDamage(lines: string, mainStat: MainStat, equivalencies: Map<string, number>) {
  let total = 0;
  for (const line of lines.split(/\r?\n/)) {
    const match = line.match(/^(.+?):?\s*\+?(-?[\d,]+)(%)?/);
    if (!match) continue;
    const label = normalizeLabel(match[1]);
    const value = Number(match[2].replaceAll(",", ""));
    if (label === mainStat) total += value * (equivalencies.get(mainStat) ?? 0);
    else if (label === "All Stat%") total += value * (equivalencies.get("All Stat%") ?? 0);
    else if (label === "Attack") total += value * (equivalencies.get("Attack") ?? 0);
    else if (label === "Boss Damage") total += value * (equivalencies.get("Boss Damage") ?? 0);
    else if (label === "Damage") total += value * (equivalencies.get("Damage") ?? 0);
  }
  return total;
}

function isFlameAdvantaged(item: EquipmentItem) {
  const advantagedSets = new Set(["Absolab", "Arcane Umbra", "Boss Accessory", "Brilliant Boss", "Dawn Boss", "Eternal", "Genesis", "Pitched Boss", "Root Abyss"]);
  return advantagedSets.has(item.catalogSetName ?? "") || /^(?:genesis|destiny)\b/i.test(item.name);
}

function parseEquivalencies(text: string) {
  const map = new Map<string, number>();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%?\s*$/);
    if (!match) continue;
    const label = normalizeLabel(match[1]);
    const quantity = Number(match[2]);
    const finalDamage = Number(match[3]);
    if (quantity > 0) map.set(label, finalDamage / quantity);
  }
  return map;
}

function potentialDamage(lines: string, mainStat: MainStat, equivalencies: Map<string, number>, slot: EquipmentSlot) {
  let total = 0;
  const ignoreGenericStat = slot === "WEAPON" || slot === "SECONDARY" || slot === "EMBLEM";
  for (const line of lines.split(/\r?\n/)) {
    const value = Number(line.match(/(\d+)\s*%/)?.[1] ?? 0);
    const normalized = normalizeLabel(line);
    const normalizedLower = normalized.toLowerCase().replace(/[^a-z%]/g, "");
    if (!ignoreGenericStat && normalizedLower.includes(mainStat.toLowerCase())) total += value * (equivalencies.get(`${mainStat}%`) ?? 0);
    else if (!ignoreGenericStat && normalizedLower.includes("allstat")) total += value * (equivalencies.get("All Stat%") ?? 0);
    else if (normalizedLower.includes("attack")) total += value * (equivalencies.get("Attack%") ?? 0);
    else if (normalizedLower.includes("boss")) total += value * (equivalencies.get("Boss Damage") ?? 0);
    else if (normalizedLower.includes("ignore") || normalizedLower.includes("ied")) total += value * (equivalencies.get("IED") ?? 0);
    else if (normalizedLower.includes("criticaldmg")) total += value * (equivalencies.get("Critical Dmg") ?? 0);
  }
  return total;
}

function selectCubingTarget(
  item: EquipmentItem,
  currentTier: CubeTier,
  itemLevel: number,
  currentDamage: number,
  mainStat: MainStat,
  equivalencies: Map<string, number>,
) {
  for (let index = CUBE_TIER_ORDER.indexOf(currentTier); index < CUBE_TIER_ORDER.length; index++) {
    const tier = CUBE_TIER_ORDER[index];
    const target = potentialBenchmarks(item.slot, tier, itemLevel, mainStat, equivalencies)
      .find((benchmark) => benchmark.value > currentDamage);
    if (target) return { target, targetTier: tier };
  }

  return null;
}

function potentialBenchmarks(
  slot: EquipmentSlot,
  tier: CubeTier,
  itemLevel: number,
  mainStat: MainStat,
  equivalencies: Map<string, number>,
): PotentialBenchmark[] {
  if (slot === "GLOVES") return gloveBenchmarks(tier, itemLevel, mainStat, equivalencies);
  if (slot === "WEAPON" || slot === "SECONDARY" || slot === "EMBLEM") {
    return offensiveBenchmarks(slot, tier, itemLevel, equivalencies);
  }

  return statBenchmarks(tier, itemLevel, mainStat, equivalencies);
}

function statBenchmarks(tier: CubeTier, itemLevel: number, mainStat: MainStat, equivalencies: Map<string, number>) {
  const prime = primeLineValue(itemLevel, tier);
  const nonPrime = Math.max(1, prime - 3);
  const statWeight = equivalencies.get(`${mainStat}%`) ?? equivalencies.get("All Stat%") ?? 0;
  const combinations = [
    { primeLines: 0, nonPrimeLines: 2 },
    { primeLines: 1, nonPrimeLines: 1 },
    { primeLines: 2, nonPrimeLines: 0 },
    { primeLines: 0, nonPrimeLines: 3 },
    { primeLines: 1, nonPrimeLines: 2 },
    { primeLines: 2, nonPrimeLines: 1 },
    { primeLines: 3, nonPrimeLines: 0 },
  ];

  return combinations
    .map(({ primeLines, nonPrimeLines }) => {
      const amount = primeLines * prime + nonPrimeLines * nonPrime;
      return {
        value: amount * statWeight,
        difficulty: amount,
        probabilityInput: cubeInput({ percStat: amount }),
        cubeType: primeLines > 0 ? "black" : "red" as RecommendationCubeType,
        label: lineMixLabel(primeLines, nonPrimeLines, `${amount}% main stat`),
        description: `${primeLines} prime line(s), ${nonPrimeLines} non-prime line(s) at ${title(tier)}`,
      };
    })
    .filter(uniqueBenchmark)
    .sort((left, right) => left.value - right.value);
}

function gloveBenchmarks(tier: CubeTier, itemLevel: number, mainStat: MainStat, equivalencies: Map<string, number>) {
  if (tier !== "legendary") return [];

  const critDamageWeight = equivalencies.get("Critical Dmg") ?? 0;
  const critDamageLine = 8;
  const primeStat = primeLineValue(itemLevel, tier);
  const nonPrimeStat = Math.max(1, primeStat - 3);
  const statWeight = equivalencies.get(`${mainStat}%`) ?? equivalencies.get("All Stat%") ?? 0;
  const possibleLines = [
    { label: "Crit Damage", value: critDamageLine * critDamageWeight, difficulty: critDamageLine, detail: `${critDamageLine}% Crit Damage` },
    { label: "Prime main stat", value: primeStat * statWeight, difficulty: primeStat, detail: `${primeStat}% main stat` },
    { label: "Non-prime main stat", value: nonPrimeStat * statWeight, difficulty: nonPrimeStat, detail: `${nonPrimeStat}% main stat` },
  ];

  const twoLineCrit = {
    value: 2 * critDamageLine * critDamageWeight,
    difficulty: 2 * critDamageLine,
    probabilityInput: cubeInput({ lineCritDamage: 2 }),
    cubeType: "black" as RecommendationCubeType,
    label: `2 Crit (${2 * critDamageLine}% Crit Damage)`,
    description: "2 Legendary crit damage lines",
  };

  return [
    twoLineCrit,
    ...lineCombinations(possibleLines, 3)
    .filter((combination) => combination.some((line) => line.label === "Crit Damage"))
    .map((combination) => {
      const critLines = combination.filter((line) => line.label === "Crit Damage").length;
      const primeStatLines = combination.filter((line) => line.label === "Prime main stat").length;
      const nonPrimeStatLines = combination.filter((line) => line.label === "Non-prime main stat").length;
      const statPercent = primeStatLines * primeStat + nonPrimeStatLines * nonPrimeStat;
      const details = [
        critLines ? `${critLines} Crit` : "",
        primeStatLines ? `${primeStatLines} prime stat` : "",
        nonPrimeStatLines ? `${nonPrimeStatLines} non-prime stat` : "",
      ].filter(Boolean).join(" / ");
      return {
        value: combination.reduce((sum, line) => sum + line.value, 0),
        difficulty: combination.reduce((sum, line) => sum + line.difficulty, 0),
        probabilityInput: cubeInput({ lineCritDamage: critLines, ...(statPercent ? { percStat: statPercent } : {}) }),
        cubeType: "black" as RecommendationCubeType,
        label: `${details} (${critLines * critDamageLine}% Crit Damage${statPercent ? `, ${statPercent}% main stat` : ""})`,
        description: combination.map((line) => line.detail).join(", "),
      };
    }),
  ]
    .filter(uniqueBenchmark)
    .sort((left, right) => left.value - right.value);
}

function offensiveBenchmarks(slot: EquipmentSlot, tier: CubeTier, itemLevel: number, equivalencies: Map<string, number>) {
  const options = offensiveLineOptions(slot, tier, itemLevel, equivalencies);
  const combinations = [
    { primeLines: 0, nonPrimeLines: 2 },
    { primeLines: 1, nonPrimeLines: 1 },
    { primeLines: 2, nonPrimeLines: 0 },
    { primeLines: 0, nonPrimeLines: 3 },
    { primeLines: 1, nonPrimeLines: 2 },
    { primeLines: 2, nonPrimeLines: 1 },
    { primeLines: 3, nonPrimeLines: 0 },
  ];

  return combinations
    .flatMap(({ primeLines, nonPrimeLines }) => bestOffensiveMixes(options, primeLines, nonPrimeLines).map((mix) => ({
      value: mix.value,
      difficulty: mix.difficulty,
      probabilityInput: mix.probabilityInput,
      cubeType: primeLines > 0 ? "black" : "red" as RecommendationCubeType,
      label: lineMixLabel(primeLines, nonPrimeLines, mix.label),
      description: `${mix.description}; ${slot === "EMBLEM" ? "emblems exclude boss damage" : "ATT weighted first, boss next, IED lowest"}`,
    })))
    .filter(uniqueBenchmark)
    .sort((left, right) => left.value - right.value);
}

function offensiveLineOptions(slot: EquipmentSlot, tier: CubeTier, itemLevel: number, equivalencies: Map<string, number>) {
  const primeAttack = primeLineValue(itemLevel, tier);
  const nonPrimeAttack = Math.max(1, primeAttack - 3);
  const options = [
    lineOption("ATT", "percAtt", true, primeAttack, equivalencies.get("Attack%") ?? 0, 1),
    lineOption("ATT", "percAtt", false, nonPrimeAttack, equivalencies.get("Attack%") ?? 0, 1),
  ];

  if (tier === "unique" || tier === "legendary") {
    if (slot !== "EMBLEM") {
      options.push(
        lineOption("Boss", "percBoss", true, tier === "legendary" ? 40 : 30, equivalencies.get("Boss Damage") ?? 0, 1.05),
        lineOption("Boss", "percBoss", false, tier === "legendary" ? 30 : 20, equivalencies.get("Boss Damage") ?? 0, 1.05),
      );
    }
    options.push(
      lineOption("IED", "lineIed", true, tier === "legendary" ? 40 : 30, equivalencies.get("IED") ?? 0, 1.15),
      lineOption("IED", "lineIed", false, tier === "legendary" ? 30 : 15, equivalencies.get("IED") ?? 0, 1.15),
    );
  }

  return options.filter((option) => option.value > 0);
}

function lineOption(label: string, field: keyof typeof EMPTY_CUBE_INPUT, prime: boolean, amount: number, weight: number, difficultyMultiplier: number) {
  return {
    label,
    field,
    prime,
    amount,
    value: amount * weight,
    difficulty: amount * difficultyMultiplier,
  };
}

function bestOffensiveMixes(
  options: ReturnType<typeof offensiveLineOptions>,
  primeLines: number,
  nonPrimeLines: number,
) {
  const primeOptions = options.filter((option) => option.prime);
  const nonPrimeOptions = options.filter((option) => !option.prime);
  const primeMixes = lineCombinations(primeOptions, primeLines);
  const nonPrimeMixes = lineCombinations(nonPrimeOptions, nonPrimeLines);

  return primeMixes.flatMap((primeMix) => nonPrimeMixes.map((nonPrimeMix) => {
    const lines = [...primeMix, ...nonPrimeMix];
    const counts = lines.reduce<Record<string, number>>((accumulator, line) => {
      accumulator[line.label] = (accumulator[line.label] ?? 0) + 1;
      return accumulator;
    }, {});
    const label = Object.entries(counts).map(([line, count]) => `${count} ${line}`).join(" / ");
    const value = lines.reduce((sum, line) => sum + line.value, 0);
    const difficulty = lines.reduce((sum, line) => sum + line.difficulty, 0);
    const description = lines.map((line) => `${line.amount}% ${line.label}`).join(", ");
    const probabilityInput = cubeInput();
    for (const line of lines) {
      probabilityInput[line.field] += line.field === "lineIed" ? 1 : line.amount;
    }
    return { label, value, difficulty, description, probabilityInput };
  }));
}

function lineCombinations<T>(options: T[], count: number): T[][] {
  if (count === 0) return [[]];
  if (options.length === 0) return [];

  const combinations: T[][] = [];
  for (const option of options) {
    for (const rest of lineCombinations(options, count - 1)) {
      combinations.push([option, ...rest]);
    }
  }
  return combinations;
}

function lineMixLabel(primeLines: number, nonPrimeLines: number, detail: string) {
  const mix = `${primeLines ? `${primeLines} prime` : ""}${primeLines && nonPrimeLines ? " + " : ""}${nonPrimeLines ? `${nonPrimeLines} non-prime` : ""}`;
  return `${mix} (${detail})`;
}

function uniqueBenchmark(benchmark: PotentialBenchmark, index: number, benchmarks: PotentialBenchmark[]) {
  return benchmarks.findIndex((other) => other.label === benchmark.label || Math.abs(other.value - benchmark.value) < 0.000001) === index;
}

function primeLineValue(itemLevel: number, tier: CubeTier) {
  const tierIndex = CUBE_TIER_ORDER.indexOf(tier);
  const levelBonus = itemLevel >= 160 ? 1 : 0;
  return 3 + 3 * tierIndex + levelBonus;
}

function expectedTierUpCost(current: CubeTier, desired: CubeTier, level: number) {
  let cubes = 0;
  for (let index = CUBE_TIER_ORDER.indexOf(current); index < CUBE_TIER_ORDER.indexOf(desired); index++) {
    cubes += 1 / TIER_UP_RATE.black[CUBE_TIER_ORDER[index]];
  }
  return cubes * cubeCost(level, "black");
}

function expectedRerollCost(
  probabilityInput: ProbabilityInput,
  tier: CubeTier,
  level: number,
  slot: EquipmentSlot,
  cubeType: RecommendationCubeType,
) {
  const probability = cubeProbability(CUBE_TIER_NUMBER[tier], probabilityInput, cubeItemType(slot), level, cubeType);
  return geometricMean(probability) * cubeCost(level, cubeType);
}

function cubeInput(overrides: Partial<ProbabilityInput> = {}): ProbabilityInput {
  return { ...EMPTY_CUBE_INPUT, ...overrides };
}

function geometricMean(probability: number) {
  if (probability <= 0) return Infinity;
  if (probability >= 1) return 0;
  return 1 / probability;
}

function cubeProbability(
  desiredTier: CubeTierNumber,
  probabilityInput: ProbabilityInput,
  itemType: CubeItemType,
  itemLevel: number,
  cubeType: RecommendationCubeType,
) {
  if (Object.values(probabilityInput).every((value) => value === 0)) return 1;

  const tier = CUBE_TIER_ORDER[desiredTier];
  const itemLabel = itemType === "accessory" ? "ring" : itemType === "badge" ? "heart" : itemType;
  const source = cubeRates.lvl120to200[itemLabel]?.[cubeType]?.[tier];
  if (!source) return 0;

  const cubeData = adjustCubeDataForLevel({
    first_line: source.first_line as CubeLine[],
    second_line: source.second_line as CubeLine[],
    third_line: source.third_line as CubeLine[],
  }, itemLevel);

  const usefulCategories = cubeUsefulCategories(probabilityInput);
  const consolidated = {
    first_line: consolidateCubeRates(cubeData.first_line, usefulCategories),
    second_line: consolidateCubeRates(cubeData.second_line, usefulCategories),
    third_line: consolidateCubeRates(cubeData.third_line, usefulCategories),
  };

  let totalChance = 0;
  for (const line1 of consolidated.first_line) {
    for (const line2 of consolidated.second_line) {
      for (const line3 of consolidated.third_line) {
        const outcome = [line1, line2, line3];
        if (cubeOutcomeSatisfies(outcome, probabilityInput)) totalChance += cubeOutcomeRate(outcome, consolidated);
      }
    }
  }

  return totalChance / 100;
}

function cubeItemType(slot: EquipmentSlot): CubeItemType {
  if (slot === "WEAPON") return "weapon";
  if (slot === "SECONDARY") return "secondary";
  if (slot === "EMBLEM") return "emblem";
  if (slot === "GLOVES") return "gloves";
  if (slot === "HAT") return "hat";
  if (slot === "TOP") return "top";
  if (slot === "BOTTOM") return "bottom";
  if (slot === "SHOES") return "shoes";
  if (slot === "CAPE") return "cape";
  if (slot === "BELT") return "belt";
  if (slot === "SHOULDER") return "shoulder";
  if (slot === "HEART") return "heart";
  return "accessory";
}

function cubeUsefulCategories(input: ProbabilityInput) {
  const categories = new Set<string>();
  for (const [field, amount] of Object.entries(input) as Array<[keyof typeof EMPTY_CUBE_INPUT, number]>) {
    if (amount > 0) for (const category of CUBE_INPUT_CATEGORY_MAP[field]) categories.add(category);
  }
  return [...categories];
}

function consolidateCubeRates(ratesList: CubeLine[], usefulCategories: string[]) {
  const consolidated: CubeLine[] = [];
  let junkRate = 0;
  const junkCategories: string[] = [];

  for (const line of ratesList) {
    const [category, value, rate] = line;
    if (usefulCategories.includes(category) || cubeSpecialLine(category)) {
      consolidated.push(line);
    } else if (category === CUBE_CATEGORY.JUNK) {
      junkRate += rate;
      if (Array.isArray(value)) junkCategories.push(...value);
      else junkCategories.push(String(value));
    } else {
      junkRate += rate;
      junkCategories.push(`${category} (${value})`);
    }
  }

  consolidated.push([CUBE_CATEGORY.JUNK, junkCategories, junkRate]);
  return consolidated;
}

function cubeSpecialLine(category: string) {
  return Object.keys(MAX_CUBE_CATEGORY_COUNT).includes(category);
}

function cubeTotal(outcome: CubeLine[], desiredCategory: string, byValue = false) {
  return outcome.reduce((sum, [category, value]) => {
    if (category !== desiredCategory) return sum;
    return sum + (byValue && typeof value === "number" ? value : 1);
  }, 0);
}

function cubeAllStatSatisfied(outcome: CubeLine[], required: number) {
  let actual = 0;
  for (const [category, value] of outcome) {
    if (typeof value !== "number") continue;
    if (category === CUBE_CATEGORY.ALLSTATS_PERC) actual += value;
    else if (([CUBE_CATEGORY.STR_PERC, CUBE_CATEGORY.DEX_PERC, CUBE_CATEGORY.LUK_PERC] as string[]).includes(category)) actual += value / 3;
  }
  return actual >= required;
}

function cubeOutcomeSatisfies(outcome: CubeLine[], input: ProbabilityInput) {
  return Object.entries(input).every(([field, required]) => {
    if (required <= 0) return true;
    switch (field) {
      case "percStat": return cubeTotal(outcome, CUBE_CATEGORY.STR_PERC, true) + cubeTotal(outcome, CUBE_CATEGORY.ALLSTATS_PERC, true) >= required;
      case "lineStat": return cubeTotal(outcome, CUBE_CATEGORY.STR_PERC) + cubeTotal(outcome, CUBE_CATEGORY.ALLSTATS_PERC) >= required;
      case "percAllStat": return cubeAllStatSatisfied(outcome, required);
      case "lineAllStat": return cubeTotal(outcome, CUBE_CATEGORY.ALLSTATS_PERC) >= required;
      case "percHp": return cubeTotal(outcome, CUBE_CATEGORY.MAXHP_PERC, true) >= required;
      case "lineHp": return cubeTotal(outcome, CUBE_CATEGORY.MAXHP_PERC) >= required;
      case "percAtt": return cubeTotal(outcome, CUBE_CATEGORY.ATT_PERC, true) >= required;
      case "lineAtt": return cubeTotal(outcome, CUBE_CATEGORY.ATT_PERC) >= required;
      case "percBoss": return cubeTotal(outcome, CUBE_CATEGORY.BOSSDMG_PERC, true) >= required;
      case "lineBoss": return cubeTotal(outcome, CUBE_CATEGORY.BOSSDMG_PERC) >= required;
      case "lineIed": return cubeTotal(outcome, CUBE_CATEGORY.IED_PERC) >= required;
      case "lineCritDamage": return cubeTotal(outcome, CUBE_CATEGORY.CRITDMG_PERC) >= required;
      case "lineMeso": return cubeTotal(outcome, CUBE_CATEGORY.MESO_PERC) >= required;
      case "lineDrop": return cubeTotal(outcome, CUBE_CATEGORY.DROP_PERC) >= required;
      case "lineMesoOrDrop": return cubeTotal(outcome, CUBE_CATEGORY.MESO_PERC) + cubeTotal(outcome, CUBE_CATEGORY.DROP_PERC) >= required;
      case "secCooldown": return cubeTotal(outcome, CUBE_CATEGORY.CDR_TIME, true) >= required;
      case "lineAutoSteal": return cubeTotal(outcome, CUBE_CATEGORY.AUTOSTEAL_PERC) >= required;
      case "lineAttOrBoss": return cubeTotal(outcome, CUBE_CATEGORY.ATT_PERC) + cubeTotal(outcome, CUBE_CATEGORY.BOSSDMG_PERC) >= required;
      case "lineAttOrBossOrIed": return cubeTotal(outcome, CUBE_CATEGORY.ATT_PERC) + cubeTotal(outcome, CUBE_CATEGORY.BOSSDMG_PERC) + cubeTotal(outcome, CUBE_CATEGORY.IED_PERC) >= required;
      case "lineBossOrIed": return cubeTotal(outcome, CUBE_CATEGORY.BOSSDMG_PERC) + cubeTotal(outcome, CUBE_CATEGORY.IED_PERC) >= required;
      default: return true;
    }
  });
}

function cubeAdjustedRate(currentLine: CubeLine, previousLines: CubeLine[], currentPool: CubeLine[]) {
  const currentCategory = currentLine[0];
  const previousCounts: Record<string, number> = {};

  for (const [category] of previousLines) {
    if (cubeSpecialLine(category)) previousCounts[category] = (previousCounts[category] ?? 0) + 1;
  }

  const removed: string[] = [];
  for (const [category, count] of Object.entries(previousCounts)) {
    if (count > MAX_CUBE_CATEGORY_COUNT[category] || (category === currentCategory && count + 1 > MAX_CUBE_CATEGORY_COUNT[category])) return 0;
    if (count === MAX_CUBE_CATEGORY_COUNT[category]) removed.push(category);
  }

  let adjustedTotal = 100;
  for (const [category, , rate] of currentPool) {
    if (removed.includes(category)) adjustedTotal -= rate;
  }

  return adjustedTotal === 100 ? currentLine[2] : currentLine[2] / adjustedTotal * 100;
}

function cubeOutcomeRate(outcome: CubeLine[], filteredRates: { first_line: CubeLine[]; second_line: CubeLine[]; third_line: CubeLine[] }) {
  const rates = [
    cubeAdjustedRate(outcome[0], [], filteredRates.first_line),
    cubeAdjustedRate(outcome[1], [outcome[0]], filteredRates.second_line),
    cubeAdjustedRate(outcome[2], [outcome[0], outcome[1]], filteredRates.third_line),
  ];
  return rates.reduce((chance, rate) => chance * (rate / 100), 100);
}

function adjustCubeDataForLevel(cubeData: { first_line: CubeLine[]; second_line: CubeLine[]; third_line: CubeLine[] }, itemLevel: number) {
  if (itemLevel < 160) return cubeData;
  const affected = new Set([CUBE_CATEGORY.STR_PERC, CUBE_CATEGORY.LUK_PERC, CUBE_CATEGORY.DEX_PERC, CUBE_CATEGORY.ALLSTATS_PERC, CUBE_CATEGORY.ATT_PERC, CUBE_CATEGORY.MAXHP_PERC, "INT %", "MATT %"]);
  const adjustLine = ([category, value, rate]: CubeLine): CubeLine => [category, affected.has(category) && typeof value === "number" ? value + 1 : value, rate];
  return {
    first_line: cubeData.first_line.map(adjustLine),
    second_line: cubeData.second_line.map(adjustLine),
    third_line: cubeData.third_line.map(adjustLine),
  };
}

function cubeCost(level: number, cubeType: RecommendationCubeType) {
  return CUBE_COSTS[cubeType] + revealCost(level);
}

function revealCost(level: number) {
  if (level < 30) return 0;
  if (level <= 70) return 0.5 * level ** 2;
  if (level <= 120) return 2.5 * level ** 2;
  return 20 * level ** 2;
}

function expectedStarCost(level: number, current: number, target: number, settings: StarForceSettings) {
  const costs = new Float64Array(target + 1);
  for (let pass = 0; pass < 5000; pass++) {
    let delta = 0;
    for (let star = target - 1; star >= 0; star--) {
      const mode = settings.modes[star] ?? 1;
      const modeRates = modeRate(star, mode);
      let success = modeRates.success;
      let boom = modeRates.boom;
      if (settings.starCatch) success = Math.min(1, success * 1.05);
      const originalFailure = 1 - modeRates.success;
      if (originalFailure > 0) boom = (1 - success) * (boom / originalFailure);
      if (settings.reducedBoom && star <= 21) boom *= .7;
      const maintain = 1 - success - boom;
      const recover = Math.min(target, recoveryStar(star));
      const next = Math.min(target, star + (settings.twoStars && star < 11 ? 2 : 1));
      const nextCost = (attemptCost(level, star, modeRates.multiplier, settings) + success * costs[next] + boom * costs[recover]) / (1 - maintain);
      delta = Math.max(delta, Math.abs(nextCost - costs[star]) / (1 + nextCost));
      costs[star] = nextCost;
    }
    if (delta < 1e-12) break;
  }
  return costs[current];
}

function modeRate(star: number, mode: number) {
  const modes: Record<number, Array<{ multiplier: number; success: number; boom: number }>> = {
    15: [{ multiplier: 1, success: .3, boom: .021 }, { multiplier: 1.5, success: .3, boom: .014 }, { multiplier: 2.5, success: .3, boom: .007 }, { multiplier: 3, success: .3, boom: 0 }],
    16: [{ multiplier: 1, success: .3, boom: .021 }, { multiplier: 1.5, success: .3, boom: .014 }, { multiplier: 2.5, success: .3, boom: .007 }, { multiplier: 3, success: .3, boom: 0 }],
    17: [{ multiplier: 1, success: .15, boom: .068 }, { multiplier: 1.5, success: .15, boom: .0425 }, { multiplier: 2.5, success: .15, boom: .017 }, { multiplier: 3, success: .15, boom: 0 }],
    18: [{ multiplier: 1, success: .15, boom: .068 }, { multiplier: 2, success: .12, boom: .044 }, { multiplier: 3.5, success: .1, boom: .018 }, { multiplier: 6.5, success: .08, boom: 0 }],
    19: [{ multiplier: 1, success: .15, boom: .085 }, { multiplier: 2, success: .12, boom: .0616 }, { multiplier: 3.5, success: .1, boom: .036 }, { multiplier: 6.5, success: .08, boom: 0 }],
    20: [{ multiplier: 1, success: .3, boom: .105 }, { multiplier: 2, success: .25, boom: .075 }, { multiplier: 3.5, success: .2, boom: .04 }, { multiplier: 6.5, success: .15, boom: 0 }],
    21: [{ multiplier: 1, success: .15, boom: .1275 }, { multiplier: 2, success: .12, boom: .088 }, { multiplier: 3.5, success: .1, boom: .045 }, { multiplier: 6.5, success: .08, boom: 0 }],
  };
  return modes[star]?.[mode - 1] ?? { multiplier: 1, ...baseRate(star) };
}

function attemptCost(level: number, star: number, multiplier: number, settings: StarForceSettings) {
  let cost = Math.round(baseCost(level, star) * multiplier);
  if (star < 17) cost = Math.floor(cost * (1 - mvpDiscount(settings.mvp)));
  if (settings.thirtyOff) cost = Math.floor(cost * .7);
  return cost;
}

function mvpDiscount(mvp: StarForceSettings["mvp"]) {
  if (mvp === "silver") return .03;
  if (mvp === "gold") return .05;
  if (mvp === "diamond") return .1;
  return 0;
}

function baseRate(star: number) {
  const rates: Record<number, { success: number; boom: number }> = {
    0: { success: .95, boom: 0 }, 1: { success: .9, boom: 0 }, 2: { success: .85, boom: 0 }, 3: { success: .85, boom: 0 }, 4: { success: .8, boom: 0 },
    5: { success: .75, boom: 0 }, 6: { success: .7, boom: 0 }, 7: { success: .65, boom: 0 }, 8: { success: .6, boom: 0 }, 9: { success: .55, boom: 0 },
    10: { success: .5, boom: 0 }, 11: { success: .45, boom: 0 }, 12: { success: .4, boom: 0 }, 13: { success: .35, boom: 0 }, 14: { success: .3, boom: 0 },
    15: { success: .3, boom: .021 }, 16: { success: .3, boom: .021 }, 17: { success: .15, boom: .068 }, 18: { success: .15, boom: .068 },
    19: { success: .15, boom: .085 }, 20: { success: .3, boom: .105 }, 21: { success: .15, boom: .1275 }, 22: { success: .15, boom: .17 },
    23: { success: .1, boom: .18 }, 24: { success: .1, boom: .18 }, 25: { success: .1, boom: .18 }, 26: { success: .07, boom: .186 },
    27: { success: .05, boom: .19 }, 28: { success: .03, boom: .194 }, 29: { success: .01, boom: .198 },
  };
  return rates[star] ?? { success: .01, boom: .198 };
}

function baseCost(level: number, star: number) {
  const roundedLevel = 10 * Math.floor(level / 10);
  if (star <= 9) return 100 * Math.round((roundedLevel ** 3 * (star + 1)) / 2500 + 10);
  const divisor: Record<number, number> = { 10: 40000, 11: 22000, 12: 15000, 13: 11000, 14: 7500, 15: 20000, 16: 20000, 17: 15000, 18: 7000, 19: 4500, 20: 20000, 21: 12500 };
  return 100 * Math.round((roundedLevel ** 3 * (star + 1) ** 2.7) / (divisor[star] ?? 20000) + 10);
}

function recoveryStar(star: number) {
  if (star <= 19) return 12;
  if (star === 20) return 15;
  if (star <= 22) return 17;
  if (star <= 25) return 19;
  return 20;
}

function parseTier(value: string): CubeTier {
  const normalized = value.toLowerCase();
  if (normalized.includes("legend")) return "legendary";
  if (normalized.includes("unique")) return "unique";
  if (normalized.includes("epic")) return "epic";
  return "rare";
}

function normalizeLabel(value: string) {
  const compact = value.toLowerCase().replace(/[^a-z%]/g, "");
  if (compact.includes("boss")) return "Boss Damage";
  if (compact === "damage" || compact === "damage%") return "Damage";
  if (compact.includes("critical")) return "Critical Dmg";
  if (compact.includes("ignore") || compact.includes("ied")) return "IED";
  if (compact.includes("allstat")) return "All Stat%";
  if (compact.includes("str%")) return "STR%";
  if (compact.includes("dex%")) return "DEX%";
  if (compact.includes("int%")) return "INT%";
  if (compact.includes("luk%")) return "LUK%";
  if (compact === "str") return "STR";
  if (compact === "dex") return "DEX";
  if (compact === "int") return "INT";
  if (compact === "luk") return "LUK";
  if (compact.includes("attack%")) return "Attack%";
  if (compact.includes("attack")) return "Attack";
  return value.trim();
}

function title(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatMeso(value: number) {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}t`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}b`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}m`;
  return Math.round(value).toLocaleString();
}
