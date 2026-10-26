"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { BOSSES, formatMeso, personalCrystalIncome, type ResetPeriod } from "@/components/boss-tracker-data";
import { characterBossIncome, countedWeeklyBosses } from "../../../shared/boss-income";

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
type BossPreset = { id: number; name: string };

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

export function BossTracker({ profileId, characterName, onPlanChange }: { profileId: number; characterName: string; onPlanChange: () => void }) {
  const [rows, setRows] = useState<BossState[]>(DEFAULT_ROWS);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [planLoaded, setPlanLoaded] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [presets, setPresets] = useState<BossPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [presetId, setPresetId] = useState("");
  const [presetError, setPresetError] = useState("");
  const [presetsLoaded, setPresetsLoaded] = useState(false);
  const persistedRows = useRef(DEFAULT_ROWS);
  const editedCrystalKey = useRef<string | null>(null);

  useEffect(() => {
    let current = true;
    void (async () => {
      try {
        const response = await apiFetch("/api/v1/boss-tracker/presets");
        if (!response.ok) throw new Error(await responseMessage(response, "Could not load presets."));
        const loaded = await response.json() as BossPreset[];
        if (current) setPresets(loaded);
      } catch (error) {
        if (current) setPresetError(errorMessage(error));
      } finally {
        if (current) setPresetsLoaded(true);
      }
    })();
    return () => { current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    void (async () => {
      try {
        const response = await apiFetch(`/api/v1/boss-tracker?characterProfileId=${profileId}`);
        if (!response.ok) throw new Error(await responseMessage(response, "Could not load this boss plan."));
        const saved = await response.json() as SavedEntry[];
        const byKey = new Map(saved.map((entry) => [entry.bossKey, entry]));
        if (current) {
          const loaded = DEFAULT_ROWS.map((row) => ({ ...row, ...byKey.get(row.bossKey) }));
          persistedRows.current = loaded;
          setRows(loaded);
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

  const totals = useMemo(() => characterBossIncome(rows), [rows]);
  const countedKeys = useMemo(() => new Set(countedWeeklyBosses(rows).map((row) => row.bossKey)), [rows]);

  const visibleRows = useMemo(() => rows.filter((row) => {
    if (query && !row.bossName.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === "tracked" && !row.tracked) return false;
    if (filter === "cleared" && !row.cleared) return false;
    return true;
  }), [filter, query, rows]);

  async function updateRow(key: string, change: Partial<BossState>, save = true) {
    const row = rows.find((row) => row.bossKey === key);
    const previous = persistedRows.current.find((row) => row.bossKey === key);
    if (!row || !previous) return;
    const next = { ...row, ...change };
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
      persistedRows.current = persistedRows.current.map((row) => row.bossKey === key ? next : row);
      onPlanChange();
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
      persistedRows.current = persistedRows.current.map((row) => ({ ...row, cleared: false }));
      setMessage("Clears reset. Your plan and party sizes were kept.");
      onPlanChange();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSaving(null);
    }
  }

  async function savePreset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("preset");
    setMessage("");
    try {
      const response = await apiFetch("/api/v1/boss-tracker/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterProfileId: profileId, name: presetName.trim(), entries: rows.filter((row) => row.tracked) }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, "Could not save preset."));
      const preset = await response.json() as BossPreset;
      setPresets((current) => [...current, preset].sort((a, b) => a.name.localeCompare(b.name)));
      setPresetId(String(preset.id));
      setPresetName("");
      setMessage(`Saved preset “${preset.name}”. It is available to all your characters.`);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSaving(null);
    }
  }

  async function applyPreset() {
    if (!presetId) return;
    setSaving("preset");
    setMessage("");
    try {
      const response = await apiFetch(`/api/v1/boss-tracker/presets/${presetId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterProfileId: profileId }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, "Could not apply preset."));
      const saved = await response.json() as SavedEntry[];
      const byKey = new Map(saved.map((entry) => [entry.bossKey, entry]));
      const loaded = DEFAULT_ROWS.map((row) => ({ ...row, ...byKey.get(row.bossKey) }));
      persistedRows.current = loaded;
      setRows(loaded);
      setMessage(`Applied preset to ${characterName}.`);
      onPlanChange();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSaving(null);
    }
  }

  if (entriesLoading || !planLoaded) {
    return <div className="boss-calculator"><h2>Boss tracker</h2><p role={entriesLoading ? "status" : "alert"}>{entriesLoading ? `Loading ${characterName}’s boss plan…` : message}</p></div>;
  }

  return (
    <div className="boss-calculator" aria-label={`${characterName} boss tracker`}>
      <div className="boss-heading">
        <div><h2>Boss Tracker &amp; Income</h2><p className="muted">Plan {characterName}’s clears, split crystals by party size, and track their payout.</p></div>
      </div>

      <div className="boss-summary" aria-label="Income summary">
        <article><span>Cleared</span><strong>{totals.cleared} / {totals.planned}</strong><small>planned bosses</small></article>
        <article><span>Earned this week</span><strong>{formatMeso(totals.weeklyCleared)}</strong><small>{totals.clearedCrystals} / 14 weekly crystals</small></article>
        <article><span>Weekly plan</span><strong>{formatMeso(totals.weeklyPlan)}</strong><small>{totals.plannedCrystals} / 14 weekly crystals</small></article>
        <article><span>Monthly projection</span><strong>{formatMeso(totals.monthlyProjection)}</strong><small>4.345 weeks + {formatMeso(totals.monthlyPlan)} monthly</small></article>
      </div>
      <p className="muted">Select as many bosses as you like. Weekly income counts the 14 highest payouts after party splits. Earned income uses cleared bosses; monthly bosses are separate.</p>

      <section className="boss-presets" aria-label="Boss presets">
        <h3>Boss presets</h3>
        <p className="muted">Save this selection, difficulties, crystal values, and party sizes for any character. Applying replaces the plan and keeps clears only for bosses that remain selected.</p>
        <form className="boss-preset-form" onSubmit={savePreset}>
          <label>Preset name<input maxLength={80} value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="e.g. Weekly boss mule" required /></label>
          <button className="secondary-button" type="submit" disabled={saving !== null || !presetName.trim() || totals.planned === 0}>Save selected bosses</button>
        </form>
        <div className="boss-preset-form">
          <label>Saved preset<select value={presetId} onChange={(event) => setPresetId(event.target.value)} disabled={saving !== null || !presetsLoaded || presets.length === 0}>
            <option value="">{!presetsLoaded ? "Loading presets…" : presetError ? "Presets unavailable" : presets.length === 0 ? "No presets saved yet" : "Choose a preset"}</option>
            {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
          </select></label>
          <button className="secondary-button" type="button" onClick={() => void applyPreset()} disabled={saving !== null || !presetId}>Apply to {characterName}</button>
        </div>
        {presetError && <p role="alert">{presetError}</p>}
      </section>

      <section className="boss-list-section">
        <div className="boss-toolbar">
          <div className="segmented" aria-label="Filter bosses">
            {(["all", "tracked", "cleared"] as Filter[]).map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
          </div>
          <input aria-label="Search bosses" type="search" placeholder="Search bosses" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button className="secondary-button" type="button" onClick={resetClears} disabled={saving !== null || totals.cleared === 0}>{saving === "reset" ? "Resetting…" : "Reset clears"}</button>
        </div>
        {message && <p className="message" role="status">{message}</p>}
        <div className="table-scroll">
          <table className="boss-table">
            <thead><tr><th>Plan</th><th>Boss</th><th>Difficulty</th><th>Crystal value</th><th>Party</th><th>Your share</th><th>Cleared</th></tr></thead>
            <tbody aria-busy={saving !== null}>
              {visibleRows.map((row) => {
                const boss = BOSSES.find((item) => item.key === row.bossKey)!;
                return <tr key={row.bossKey} className={row.cleared ? "is-cleared" : ""}>
                  <td><input aria-label={`Plan ${row.bossName}`} type="checkbox" checked={row.tracked} disabled={saving !== null} onChange={(event) => void updateRow(row.bossKey, { tracked: event.target.checked })} /></td>
                  <td><strong>{row.bossName}</strong>{row.resetPeriod === "MONTHLY" && <span className="period-pill">Monthly</span>}{row.tracked && row.resetPeriod === "WEEKLY" && !countedKeys.has(row.bossKey) && <small className="boss-limit-note">Outside top 14 plan</small>}</td>
                  <td><select aria-label={`${row.bossName} difficulty`} value={row.difficulty} disabled={!row.tracked || saving !== null} onChange={(event) => {
                    const selected = boss.difficulties.find((difficulty) => difficulty.name === event.target.value)!;
                    void updateRow(row.bossKey, { difficulty: selected.name, crystalValue: selected.crystalValue });
                  }}>{boss.difficulties.map((difficulty) => <option key={difficulty.name}>{difficulty.name}</option>)}</select></td>
                  <td><input className="meso-input" aria-label={`${row.bossName} crystal value`} type="number" min={0} max={100_000_000_000} value={row.crystalValue} disabled={!row.tracked || saving !== null} onChange={(event) => {
                    editedCrystalKey.current = row.bossKey;
                    void updateRow(row.bossKey, { crystalValue: Math.max(0, Math.min(100_000_000_000, Math.floor(Number(event.target.value) || 0))) }, false);
                  }} onBlur={() => {
                    if (editedCrystalKey.current !== row.bossKey) return;
                    editedCrystalKey.current = null;
                    void updateRow(row.bossKey, {});
                  }} /></td>
                  <td><select aria-label={`${row.bossName} party size`} value={row.partySize} disabled={!row.tracked || saving !== null} onChange={(event) => void updateRow(row.bossKey, { partySize: Number(event.target.value) })}>{[1, 2, 3, 4, 5, 6].map((size) => <option key={size} value={size}>{size}</option>)}</select></td>
                  <td className="income-cell"><strong>{formatMeso(personalCrystalIncome(row.crystalValue, row.partySize))}</strong></td>
                  <td><input aria-label={`Mark ${row.bossName} cleared`} type="checkbox" checked={row.cleared} disabled={!row.tracked || saving !== null} onChange={(event) => void updateRow(row.bossKey, { cleared: event.target.checked })} /></td>
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
