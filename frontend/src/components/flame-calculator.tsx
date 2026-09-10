"use client";

import { useMemo, useState } from "react";

type EquipType = "flameAdvantaged" | "nonFlameAdvantaged";

const FLAME_ADVANTAGED_TIER_CHANCE: Record<number, number> = {
  3: 0.2,
  4: 0.3,
  5: 0.36,
  6: 0.14,
};

const NON_FLAME_ADVANTAGED_TIER_CHANCE: Record<number, number> = {
  1: 0.2,
  2: 0.3,
  3: 0.36,
  4: 0.14,
};

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

function weaponLevelBand(level: number) {
  if (level >= 250) return 6;
  return Math.min(5, Math.floor(level / 40));
}

function levelFactor(level: number) {
  return Math.min(12, Math.floor(level / 20) + 1);
}

function pureStat(level: number, tier: number) {
  return levelFactor(level) * tier;
}

function mixedStat(level: number, tier: number) {
  return Math.min(7, Math.floor(level / 40) + 1) * tier;
}

function hpMp(level: number, tier: number) {
  if (level < 10) return tier * 3;
  if (level >= 250) return tier * 700;
  if (level >= 200) return tier * (600 + Math.floor((level - 200) / 10) * 20);
  return tier * Math.floor(level / 10) * 30;
}

function weaponAttack(level: number, baseAttack: number, tier: number, equipType: EquipType) {
  const row = equipType === "flameAdvantaged"
    ? FLAME_ADVANTAGED_WEAPON_MULTIPLIERS[weaponLevelBand(level)]
    : NON_FLAME_ADVANTAGED_WEAPON_MULTIPLIERS[weaponLevelBand(level)];
  const index = equipType === "flameAdvantaged" ? tier - 3 : tier - 1;
  const multiplier = row[index];
  return multiplier == null ? null : Math.ceil(baseAttack * (multiplier - 1));
}

function flameScore(level: number, tier: number, baseAttack: number, equipType: EquipType, weights: { stat: number; allStat: number; attack: number }) {
  const attack = weaponAttack(level, baseAttack, tier, equipType) ?? 0;
  return pureStat(level, tier) * weights.stat
    + tier * weights.allStat
    + attack * weights.attack;
}

function chanceAtLeastScore(level: number, baseAttack: number, targetScore: number, equipType: EquipType, weights: { stat: number; allStat: number; attack: number }) {
  const chances = equipType === "flameAdvantaged" ? FLAME_ADVANTAGED_TIER_CHANCE : NON_FLAME_ADVANTAGED_TIER_CHANCE;
  let chance = 0;
  for (const [tierText, probability] of Object.entries(chances)) {
    const tier = Number(tierText);
    if (flameScore(level, tier, baseAttack, equipType, weights) >= targetScore) chance += probability;
  }
  return chance;
}

function formatAttempts(probability: number) {
  if (probability <= 0) return "Not possible with selected weights";
  return Math.ceil(1 / probability).toLocaleString();
}

export function FlameCalculator() {
  const [level, setLevel] = useState(200);
  const [baseAttack, setBaseAttack] = useState(353);
  const [equipType, setEquipType] = useState<EquipType>("flameAdvantaged");
  const [statWeight, setStatWeight] = useState(1);
  const [allStatWeight, setAllStatWeight] = useState(9);
  const [attackWeight, setAttackWeight] = useState(3);
  const [targetScore, setTargetScore] = useState(100);

  const result = useMemo(() => {
    const weights = { stat: statWeight, allStat: allStatWeight, attack: attackWeight };
    return {
      weights,
      targetChance: chanceAtLeastScore(level, baseAttack, targetScore, equipType, weights),
    };
  }, [allStatWeight, attackWeight, baseAttack, equipType, level, statWeight, targetScore]);

  const tiers = Array.from({ length: 7 }, (_, index) => index + 1);
  const visibleTiers = equipType === "flameAdvantaged" ? [3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];

  return (
    <main>
      <h1>Flame Calculator</h1>

      <section>
        <h2>Equipment</h2>
        <div className="field-grid">
          <label>Equipment level
            <input type="number" min={1} max={300} value={level} onChange={(event) => setLevel(Math.min(300, Math.max(1, Number(event.target.value) || 1)))} />
          </label>
          <label>Weapon attack / magic attack
            <input type="number" min={0} value={baseAttack} onChange={(event) => setBaseAttack(Math.max(0, Number(event.target.value) || 0))} />
          </label>
          <label>Equipment type
            <select value={equipType} onChange={(event) => setEquipType(event.target.value as EquipType)}>
              <option value="flameAdvantaged">Flame-advantaged equipment</option>
              <option value="nonFlameAdvantaged">Non-flame-advantaged equipment</option>
            </select>
          </label>
          <label>Target flame score
            <input type="number" min={0} value={targetScore} onChange={(event) => setTargetScore(Math.max(0, Number(event.target.value) || 0))} />
          </label>
        </div>
      </section>

      <section>
        <h2>Score weights</h2>
        <div className="field-grid">
          <label>1 main stat =
            <input type="number" min={0} step={0.1} value={statWeight} onChange={(event) => setStatWeight(Math.max(0, Number(event.target.value) || 0))} />
          </label>
          <label>1% all stat =
            <input type="number" min={0} step={0.1} value={allStatWeight} onChange={(event) => setAllStatWeight(Math.max(0, Number(event.target.value) || 0))} />
          </label>
          <label>1 attack / magic attack =
            <input type="number" min={0} step={0.1} value={attackWeight} onChange={(event) => setAttackWeight(Math.max(0, Number(event.target.value) || 0))} />
          </label>
        </div>
      </section>

      <section>
        <h2>Target chance</h2>
        <dl>
          <dt>Chance per flame</dt><dd>{(result.targetChance * 100).toFixed(2)}%</dd>
          <dt>Expected flames</dt><dd>{formatAttempts(result.targetChance)}</dd>
        </dl>
        <p className="muted">This estimate scores a single chosen main-stat line, one all-stat line, and one weapon attack line at the same tier. The value table below follows MapleStoryWiki&apos;s bonus stat tables.</p>
      </section>

      <section>
        <h2>Possible values</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Stat</th>
                {tiers.map((tier) => <th key={tier}>Tier {tier}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr><th>Available with selected type</th>{tiers.map((tier) => <td key={tier}>{visibleTiers.includes(tier) ? "Yes" : "-"}</td>)}</tr>
              <tr><th>Pure stat</th>{tiers.map((tier) => <td key={tier}>{pureStat(level, tier)}</td>)}</tr>
              <tr><th>Mixed stat</th>{tiers.map((tier) => <td key={tier}>{mixedStat(level, tier)}</td>)}</tr>
              <tr><th>Max HP / MP</th>{tiers.map((tier) => <td key={tier}>{hpMp(level, tier)}</td>)}</tr>
              <tr><th>Defense</th>{tiers.map((tier) => <td key={tier}>{pureStat(level, tier)}</td>)}</tr>
              <tr><th>All stat %</th>{tiers.map((tier) => <td key={tier}>{tier}%</td>)}</tr>
              <tr><th>Level reduction</th>{tiers.map((tier) => <td key={tier}>-{tier * 5}</td>)}</tr>
              <tr><th>Weapon attack / magic attack</th>{tiers.map((tier) => <td key={tier}>{weaponAttack(level, baseAttack, tier, equipType) ?? "-"}</td>)}</tr>
              <tr><th>Boss damage %</th>{tiers.map((tier) => <td key={tier}>{tier * 2}%</td>)}</tr>
              <tr><th>Damage %</th>{tiers.map((tier) => <td key={tier}>{tier}%</td>)}</tr>
              <tr><th>Armor attack / magic attack</th>{tiers.map((tier) => <td key={tier}>{tier}</td>)}</tr>
              <tr><th>Flame score</th>{tiers.map((tier) => <td key={tier}>{flameScore(level, tier, baseAttack, equipType, result.weights).toFixed(1)}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
