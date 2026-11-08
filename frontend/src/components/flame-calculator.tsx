"use client";

import { useMemo, useState } from "react";
import {
  flameHpMp, flameWeaponAttack, MESO_FLAME_RESET_COST, mesoFlameChanceAtLeast, mixedFlameStat, pureFlameStat,
  type FlameEquipmentKind,
} from "../../../shared/flame";

type EquipType = "flameAdvantaged" | "nonFlameAdvantaged";

function formatAttempts(probability: number) {
  if (probability <= 0) return "Not possible with selected weights";
  return (1 / probability).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function FlameCalculator() {
  const [level, setLevel] = useState(200);
  const [baseAttack, setBaseAttack] = useState(353);
  const [equipmentKind, setEquipmentKind] = useState<FlameEquipmentKind>("armor");
  const [equipType, setEquipType] = useState<EquipType>("flameAdvantaged");
  const [statWeight, setStatWeight] = useState(1);
  const [allStatWeight, setAllStatWeight] = useState(9);
  const [attackWeight, setAttackWeight] = useState(3);
  const [targetScore, setTargetScore] = useState(100);

  const result = useMemo(() => {
    const weights = { stat: statWeight, allStat: allStatWeight, attack: attackWeight };
    const targetChance = mesoFlameChanceAtLeast({
      level,
      equipmentKind,
      flameAdvantaged: equipType === "flameAdvantaged",
      baseAttack,
      magicAttack: false,
      weights: { stats: { STR: statWeight }, maxHp: 0, allStat: allStatWeight, attack: attackWeight, bossDamage: 0, damage: 0 },
    }, targetScore);
    return {
      weights,
      targetChance,
      expectedCost: targetChance > 0 ? MESO_FLAME_RESET_COST / targetChance : Infinity,
    };
  }, [allStatWeight, attackWeight, baseAttack, equipmentKind, equipType, level, statWeight, targetScore]);

  const tiers = Array.from({ length: 7 }, (_, index) => index + 1);
  const visibleTiers = equipType === "flameAdvantaged" ? [4, 5, 6, 7] : [2, 3, 4, 5];

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
            <input type="number" min={0} disabled={equipmentKind !== "weapon"} value={baseAttack} onChange={(event) => setBaseAttack(Math.max(0, Number(event.target.value) || 0))} />
          </label>
          <label>Equipment category
            <select value={equipmentKind} onChange={(event) => setEquipmentKind(event.target.value as FlameEquipmentKind)}>
              <option value="armor">Armor / accessory</option>
              <option value="weapon">Weapon</option>
            </select>
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
          <dt>Expected resets</dt><dd>{formatAttempts(result.targetChance)}</dd>
          <dt>Expected meso cost</dt><dd>{Number.isFinite(result.expectedCost) ? formatMeso(result.expectedCost) : "Not possible"}</dd>
        </dl>
        <p className="muted">Uses the current GMS meso reset: 3 million mesos, Black Rebirth Flame rates, real distinct line combinations, and keep-before-or-after behavior. Main-stat scoring uses STR as the representative stat; all four main stats have the same roll values.</p>
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
              <tr><th>Pure stat</th>{tiers.map((tier) => <td key={tier}>{pureFlameStat(level, tier)}</td>)}</tr>
              <tr><th>Mixed stat</th>{tiers.map((tier) => <td key={tier}>{mixedFlameStat(level, tier)}</td>)}</tr>
              <tr><th>Max HP / MP</th>{tiers.map((tier) => <td key={tier}>{flameHpMp(level, tier)}</td>)}</tr>
              <tr><th>Defense</th>{tiers.map((tier) => <td key={tier}>{pureFlameStat(level, tier)}</td>)}</tr>
              <tr><th>All stat %</th>{tiers.map((tier) => <td key={tier}>{tier}%</td>)}</tr>
              <tr><th>Level reduction</th>{tiers.map((tier) => <td key={tier}>-{tier * 5}</td>)}</tr>
              <tr><th>Weapon attack / magic attack</th>{tiers.map((tier) => <td key={tier}>{equipmentKind === "weapon" && visibleTiers.includes(tier) ? flameWeaponAttack(level, baseAttack, tier, equipType === "flameAdvantaged") : "-"}</td>)}</tr>
              <tr><th>Boss damage %</th>{tiers.map((tier) => <td key={tier}>{tier * 2}%</td>)}</tr>
              <tr><th>Damage %</th>{tiers.map((tier) => <td key={tier}>{tier}%</td>)}</tr>
              <tr><th>Armor attack / magic attack</th>{tiers.map((tier) => <td key={tier}>{tier}</td>)}</tr>
              <tr><th>Pure stat + all stat score</th>{tiers.map((tier) => <td key={tier}>{(pureFlameStat(level, tier) * result.weights.stat + tier * result.weights.allStat).toFixed(1)}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function formatMeso(value: number) {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}t`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}b`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}m`;
  return Math.round(value).toLocaleString();
}
