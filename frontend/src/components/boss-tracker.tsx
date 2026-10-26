"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { BOSSES, formatMeso, personalCrystalIncome, type ResetPeriod } from "@/components/boss-tracker-data";

type SavedEntry = {
  bossKey: string;
  bossName: string;
  difficulty: string;
  resetPeriod: ResetPeriod;
  crystalValue: number;
  partySize: number;
  tracked: boolean;
  cleared: boolean;
};
type BossState = SavedEntry;
type Filter = "all" | "tracked" | "cleared";

const DEFAULT_ROWS: BossState[] = BOSSES.map((boss) => ({
  bossKey: boss.key,
  bossName: boss.name,
  difficulty: boss.difficulties[0].name,
  resetPeriod: boss.period,
  crystalValue: boss.difficulties[0].crystalValue,
  partySize: 1,
  tracked: false,
  cleared: false,
}));

export function BossTracker({ profileId, characterName }: { profileId: number; characterName: string }) {
  const [rows, setRows] = useState<BossState[]>(DEFAULT_ROWS);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [planLoaded, setPlanLoaded] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let current = true;
    void (async () => {
      try {
        const response = await apiFetch(`/api/v1/boss-tracker?characterProfileId=${profileId}`);
        if (!response.ok) throw new Error(await responseMessage(response, "Could not load this boss plan."));
        const saved = await response.json() as SavedEntry[];
        const byKey = new Map(saved.map((entry) => [entry.bossKey, entry]));
        if (current) {
          setRows(DEFAULT_ROWS.map((row) => ({ ...row, ...byKey.get(row.bossKey) })));
          setPlanLoaded(true);
        }
      } catch (error) {
        if (current) setMessage(errorMessage(error));
      } finally {
        if (current) setEntriesLoading(false);
      }
    })();
    return () => { current = false; };
  }, [profileId]);

  const totals = useMemo(() => rows.reduce((sum, row) => {
    const income = personalCrystalIncome(row.crystalValue, row.partySize);
    if (row.tracked && row.resetPeriod === "WEEKLY") sum.weeklyPlan += income;
    if (row.cleared && row.resetPeriod === "WEEKLY") sum.weeklyCleared += income;
    if (row.tracked && row.resetPeriod === "MONTHLY") sum.monthlyPlan += income;
    if (row.cleared && row.resetPeriod === "MONTHLY") sum.monthlyCleared += income;
    if (row.tracked) sum.planned += 1;
    if (row.cleared) sum.cleared += 1;
    return sum;
  }, { weeklyPlan: 0, weeklyCleared: 0, monthlyPlan: 0, monthlyCleared: 0, planned: 0, cleared: 0 }), [rows]);

  const visibleRows = useMemo(() => rows.filter((row) => {
    if (query && !row.bossName.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === "tracked" && !row.tracked) return false;
    if (filter === "cleared" && !row.cleared) return false;
    return true;
  }), [filter, query, rows]);

  async function updateRow(key: string, change: Partial<BossState>, save = true) {
    const previous = rows.find((row) => row.bossKey === key);
    if (!previous) return;
    const next = { ...previous, ...change };
    if (!next.tracked) next.cleared = false;
    setRows((current) => current.map((row) => row.bossKey === key ? next : row));
    if (!save) return;
    setSaving(key);
    setMessage("");
    try {
      const response = await apiFetch("/api/v1/boss-tracker", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterProfileId: profileId, ...next }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, "Could not save this boss."));
    } catch (error) {
      setRows((current) => current.map((row) => row.bossKey === key ? previous : row));
      setMessage(errorMessage(error));
    } finally {
      setSaving((current) => current === key ? null : current);
    }
  }

  async function resetClears() {
    setSaving("reset");
    setMessage("");
    try {
      const response = await apiFetch("/api/v1/boss-tracker/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterProfileId: profileId }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, "Could not reset clears."));
      setRows((current) => current.map((row) => ({ ...row, cleared: false })));
      setMessage("Clears reset. Your plan and party sizes were kept.");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSaving(null);
    }
  }

  if (entriesLoading || !planLoaded) {
    return <div className="boss-calculator"><h2>Boss tracker</h2><p role={entriesLoading ? "status" : "alert"}>{entriesLoading ? `Loading ${characterName}’s boss plan…` : message}</p></div>;
  }

  const monthlyProjection = totals.weeklyPlan * 4.345 + totals.monthlyPlan;
  return (
    <div className="boss-calculator" aria-label={`${characterName} boss tracker`}>
      <div className="boss-heading">
        <div><h2>Boss Tracker &amp; Income</h2><p className="muted">Plan {characterName}’s clears, split crystals by party size, and track their payout.</p></div>
      </div>

      <div className="boss-summary" aria-label="Income summary">
        <article><span>Cleared</span><strong>{totals.cleared} / {totals.planned}</strong><small>planned bosses</small></article>
        <article><span>Earned this week</span><strong>{formatMeso(totals.weeklyCleared)}</strong><small>{totals.weeklyCleared.toLocaleString()} mesos</small></article>
        <article><span>Weekly plan</span><strong>{formatMeso(totals.weeklyPlan)}</strong><small>after party splits</small></article>
        <article><span>Monthly projection</span><strong>{formatMeso(monthlyProjection)}</strong><small>4.345 weeks + monthly</small></article>
      </div>

      <section className="boss-list-section">
        <div className="boss-toolbar">
          <div className="segmented" aria-label="Filter bosses">
            {(["all", "tracked", "cleared"] as Filter[]).map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
          </div>
          <input aria-label="Search bosses" type="search" placeholder="Search bosses" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button className="secondary-button" type="button" onClick={resetClears} disabled={saving === "reset" || totals.cleared === 0}>{saving === "reset" ? "Resetting…" : "Reset clears"}</button>
        </div>
        {message && <p className="message" role="status">{message}</p>}
        <div className="table-scroll">
          <table className="boss-table">
            <thead><tr><th>Plan</th><th>Boss</th><th>Difficulty</th><th>Crystal value</th><th>Party</th><th>Your share</th><th>Cleared</th></tr></thead>
            <tbody>
              {visibleRows.map((row) => {
                const boss = BOSSES.find((item) => item.key === row.bossKey)!;
                return <tr key={row.bossKey} className={row.cleared ? "is-cleared" : ""}>
                  <td><input aria-label={`Plan ${row.bossName}`} type="checkbox" checked={row.tracked} disabled={saving === row.bossKey} onChange={(event) => void updateRow(row.bossKey, { tracked: event.target.checked })} /></td>
                  <td><strong>{row.bossName}</strong>{row.resetPeriod === "MONTHLY" && <span className="period-pill">Monthly</span>}</td>
                  <td><select aria-label={`${row.bossName} difficulty`} value={row.difficulty} disabled={!row.tracked || saving === row.bossKey} onChange={(event) => {
                    const selected = boss.difficulties.find((difficulty) => difficulty.name === event.target.value)!;
                    void updateRow(row.bossKey, { difficulty: selected.name, crystalValue: selected.crystalValue });
                  }}>{boss.difficulties.map((difficulty) => <option key={difficulty.name}>{difficulty.name}</option>)}</select></td>
                  <td><input className="meso-input" aria-label={`${row.bossName} crystal value`} type="number" min={0} max={100_000_000_000} value={row.crystalValue} disabled={!row.tracked || saving === row.bossKey} onChange={(event) => void updateRow(row.bossKey, { crystalValue: Math.max(0, Math.min(100_000_000_000, Math.floor(Number(event.target.value) || 0))) }, false)} onBlur={() => void updateRow(row.bossKey, {})} /></td>
                  <td><select aria-label={`${row.bossName} party size`} value={row.partySize} disabled={!row.tracked || saving === row.bossKey} onChange={(event) => void updateRow(row.bossKey, { partySize: Number(event.target.value) })}>{[1, 2, 3, 4, 5, 6].map((size) => <option key={size} value={size}>{size}</option>)}</select></td>
                  <td className="income-cell"><strong>{formatMeso(personalCrystalIncome(row.crystalValue, row.partySize))}</strong></td>
                  <td><input aria-label={`Mark ${row.bossName} cleared`} type="checkbox" checked={row.cleared} disabled={!row.tracked || saving === row.bossKey} onChange={(event) => void updateRow(row.bossKey, { cleared: event.target.checked })} /></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        {visibleRows.length === 0 && <p className="empty-state">No bosses match this view.</p>}
        <p className="boss-source muted">Default values: GMS Heroic v.271 reference. Crystal values are editable so you can match your world and future balance changes.</p>
      </section>
    </div>
  );
}

async function responseMessage(response: Response, fallback: string) {
  try { return ((await response.json()) as { message?: string }).message ?? fallback; } catch { return fallback; }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}
