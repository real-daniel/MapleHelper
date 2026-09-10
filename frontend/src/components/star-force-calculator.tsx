"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadStarForceSettings,
  saveStarForceSettings,
  type StarForceMode,
  type StarForceMvp,
} from "@/components/star-force-settings";

const BASE_RATES: Record<number, [number, number]> = {
  0: [.95, 0], 1: [.9, 0], 2: [.85, 0], 3: [.85, 0], 4: [.8, 0],
  5: [.75, 0], 6: [.7, 0], 7: [.65, 0], 8: [.6, 0], 9: [.55, 0],
  10: [.5, 0], 11: [.45, 0], 12: [.4, 0], 13: [.35, 0], 14: [.3, 0],
  15: [.3, .021], 16: [.3, .021], 17: [.15, .068], 18: [.15, .068],
  19: [.15, .085], 20: [.3, .105], 21: [.15, .1275], 22: [.15, .17],
  23: [.1, .18], 24: [.1, .18], 25: [.1, .18], 26: [.07, .186],
  27: [.05, .19], 28: [.03, .194], 29: [.01, .198],
};

const MODES: Record<number, Array<[number, number, number]>> = {
  15: [[1, .3, .021], [1.5, .3, .014], [2.5, .3, .007], [3, .3, 0]],
  16: [[1, .3, .021], [1.5, .3, .014], [2.5, .3, .007], [3, .3, 0]],
  17: [[1, .15, .068], [1.5, .15, .0425], [2.5, .15, .017], [3, .15, 0]],
  18: [[1, .15, .068], [2, .12, .044], [3.5, .1, .018], [6.5, .08, 0]],
  19: [[1, .15, .085], [2, .12, .0616], [3.5, .1, .036], [6.5, .08, 0]],
  20: [[1, .3, .105], [2, .25, .075], [3.5, .2, .04], [6.5, .15, 0]],
  21: [[1, .15, .1275], [2, .12, .088], [3.5, .1, .045], [6.5, .08, 0]],
};

const MVP_DISCOUNT: Record<StarForceMvp, number> = { none: 0, silver: .03, gold: .05, diamond: .1 };

function maxStars(level: number) {
  return level === 0 ? 30 : level < 95 ? 5 : level < 108 ? 8 : level < 118 ? 10 : level < 128 ? 15 : level < 138 ? 20 : 30;
}

function recoveryStar(star: number) {
  if (star <= 19) return 12;
  if (star === 20) return 15;
  if (star <= 22) return 17;
  if (star <= 25) return 19;
  return 20;
}

function baseCost(level: number, star: number) {
  const roundedLevel = 10 * Math.floor(level / 10);
  if (star <= 9) return 100 * Math.round((roundedLevel ** 3 * (star + 1)) / 2500 + 10);
  const divisor: Record<number, number> = {
    10: 40000, 11: 22000, 12: 15000, 13: 11000, 14: 7500,
    15: 20000, 16: 20000, 17: 15000, 18: 7000, 19: 4500, 20: 20000, 21: 12500,
  };
  return 100 * Math.round((roundedLevel ** 3 * (star + 1) ** 2.7) / (divisor[star] ?? 20000) + 10);
}

function lowestRelevantModeStar(current: number, target: number) {
  let lowest = current;

  for (let star = current; star < target; star++) {
    const hasDestructionPath = (BASE_RATES[star]?.[1] ?? 0) > 0
      || (MODES[star]?.some(([, , boom]) => boom > 0) ?? false);
    if (hasDestructionPath) lowest = Math.min(lowest, recoveryStar(star));
  }

  return Math.max(15, lowest);
}

function formatMeso(value: number) {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}t`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}b`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}m`;
  return Math.round(value).toLocaleString();
}

export function StarForceCalculator() {
  const initialSettings = useMemo(loadStarForceSettings, []);
  const [level, setLevel] = useState(200);
  const [current, setCurrent] = useState(17);
  const [target, setTarget] = useState(22);
  const [mvp, setMvp] = useState<StarForceMvp>(initialSettings.mvp);
  const [starCatch, setStarCatch] = useState(initialSettings.starCatch);
  const [thirtyOff, setThirtyOff] = useState(initialSettings.thirtyOff);
  const [twoStars, setTwoStars] = useState(initialSettings.twoStars);
  const [reducedBoom, setReducedBoom] = useState(initialSettings.reducedBoom);
  const [spareCost, setSpareCost] = useState(0);
  const [modes, setModes] = useState<Record<number, StarForceMode>>(initialSettings.modes);

  useEffect(() => {
    saveStarForceSettings({ mvp, starCatch, thirtyOff, twoStars, reducedBoom, modes });
  }, [modes, mvp, reducedBoom, starCatch, thirtyOff, twoStars]);

  const cap = maxStars(level);
  const firstModeStar = lowestRelevantModeStar(current, target);
  const result = useMemo(() => {
    if (!level || target <= current) return { cost: 0, booms: 0 };
    const costs = new Float64Array(target + 1);
    const booms = new Float64Array(target + 1);

    for (let pass = 0; pass < 10000; pass++) {
      let delta = 0;
      for (let star = target - 1; star >= 0; star--) {
        const mode = modes[star] ?? 1;
        const selected = MODES[star]?.[mode - 1];
        let success = selected?.[1] ?? BASE_RATES[star][0];
        let boom = selected?.[2] ?? BASE_RATES[star][1];
        const multiplier = selected?.[0] ?? 1;

        if (starCatch) success = Math.min(1, success * 1.05);
        const remaining = 1 - success;
        const originalFailure = 1 - (selected?.[1] ?? BASE_RATES[star][0]);
        if (originalFailure > 0) boom = remaining * (boom / originalFailure);
        if (reducedBoom && star <= 21) boom *= .7;

        let attemptCost = Math.round(baseCost(level, star) * multiplier);
        if (star < 17) attemptCost = Math.floor(attemptCost * (1 - MVP_DISCOUNT[mvp]));
        if (thirtyOff) attemptCost = Math.floor(attemptCost * .7);

        const maintain = 1 - success - boom;
        const next = Math.min(target, star + (twoStars && star < 11 ? 2 : 1));
        const recover = Math.min(target, recoveryStar(star));
        const denominator = 1 - maintain;
        const nextCost = (attemptCost + success * costs[next] + boom * costs[recover]) / denominator;
        const nextBooms = (success * booms[next] + boom * (1 + booms[recover])) / denominator;
        delta = Math.max(delta, Math.abs(nextCost - costs[star]) / (1 + nextCost), Math.abs(nextBooms - booms[star]));
        costs[star] = nextCost;
        booms[star] = nextBooms;
      }
      if (delta < 1e-12) break;
    }
    return { cost: costs[current], booms: booms[current] };
  }, [current, level, modes, mvp, reducedBoom, starCatch, target, thirtyOff, twoStars]);

  const total = result.cost + result.booms * spareCost;
  const setBounded = (setter: (value: number) => void, value: string, max: number) =>
    setter(Math.min(max, Math.max(0, Number(value) || 0)));

  return (
    <main>
      <h1>Star Force Calculator</h1>

      <section>
        <h2>Equipment</h2>
          <div className="field-grid">
            <label>Equipment level<input type="number" min={1} max={250} value={level} onChange={(e) => { const value = Math.min(250, Math.max(1, Number(e.target.value) || 1)); setLevel(value); setCurrent(Math.min(current, maxStars(value))); setTarget(Math.min(target, maxStars(value))); }} /></label>
            <label>Spare cost (mesos)<input type="number" min={0} value={spareCost || ""} placeholder="Optional" onChange={(e) => setSpareCost(Math.max(0, Number(e.target.value) || 0))} /></label>
            <label>Current stars<input type="number" min={0} max={cap} value={current} onChange={(e) => setBounded(setCurrent, e.target.value, cap)} /></label>
            <label>Target stars<input type="number" min={0} max={cap} value={target} onChange={(e) => setBounded(setTarget, e.target.value, cap)} /></label>
          </div>
          {target <= current && <p className="inline-warning">Target stars must be above current stars.</p>}
      </section>

      <section>
        <h2>Expected cost</h2>
        <dl>
          <dt>Mesos</dt><dd>{Math.round(result.cost).toLocaleString()} ({formatMeso(result.cost)})</dd>
          <dt>Expected booms</dt><dd>{result.booms.toFixed(2)}</dd>
          <dt>Expected spares</dt><dd>{result.booms.toFixed(2)}</dd>
          <dt>Total including spares</dt><dd>{Math.round(total).toLocaleString()} ({formatMeso(total)})</dd>
        </dl>
      </section>

      <section>
        <h2>Enhancement modes</h2>
        <p>Modes trade higher meso cost for a lower destruction chance.</p>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Attempt</th>{[1, 2, 3, 4].map((mode) => <th key={mode}>Mode {mode}</th>)}</tr></thead>
            <tbody>
            {Object.entries(MODES).map(([starText, options]) => {
              const star = Number(starText);
              const disabled = star < firstModeStar || star >= target;
              return <tr key={star}>
                <th>{star}★ → {star + 1}★</th>
                {options.map(([multiplier, success, boom], index) => <td key={index}><button type="button" disabled={disabled} aria-pressed={modes[star] === index + 1} onClick={() => setModes({ ...modes, [star]: (index + 1) as StarForceMode })}>
                  {(success * 100).toFixed(success * 100 % 1 ? 1 : 0)}% success / {(boom * 100).toFixed(boom * 100 % 1 ? 2 : 0)}% destroy / ×{multiplier} cost
                </button></td>)}
              </tr>;
            })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Events and assists</h2>
          <div className="option-list">
            <Toggle label="Star Catch every attempt" detail="+5% success rate" checked={starCatch} onChange={setStarCatch} />
            <Toggle label="30% off event" detail="Reduces meso cost" checked={thirtyOff} onChange={setThirtyOff} />
            <Toggle label="Two-star event" detail="Two stars through 10★" checked={twoStars} onChange={setTwoStars} />
            <Toggle label="Destruction reduction" detail="30% less boom chance through 21★" checked={reducedBoom} onChange={setReducedBoom} />
          </div>
      </section>

      <section>
        <h2>MVP discount</h2>
        <label>MVP tier
          <select value={mvp} onChange={(event) => setMvp(event.target.value as StarForceMvp)}>
            <option value="none">None</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="diamond">Diamond or higher</option>
          </select>
        </label>
        <p className="muted">MVP discounts apply below 17★.</p>
      </section>
    </main>
  );
}

function Toggle({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /> <span><strong>{label}</strong> — {detail}</span></label>;
}
