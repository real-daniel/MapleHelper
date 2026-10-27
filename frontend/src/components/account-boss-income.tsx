"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatMeso } from "@/components/boss-tracker-data";
import { ACCOUNT_CRYSTAL_LIMIT, type accountBossIncome } from "../../../shared/boss-income";

type Income = ReturnType<typeof accountBossIncome>;

export function AccountBossIncome({ revision }: { revision: number }) {
  const [result, setResult] = useState<{ revision: number; income?: Income; error?: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await apiFetch("/api/v1/boss-tracker/account", { signal: controller.signal });
        if (!response.ok) throw new Error("Could not load account boss income.");
        const income = await response.json() as Income;
        if (!controller.signal.aborted) setResult({ revision, income });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ revision, error: error instanceof Error ? error.message : "Could not load account boss income." });
      }
    })();
    return () => controller.abort();
  }, [revision]);

  const income = result?.income;
  return (
    <section className="account-boss-income" aria-label="Account boss income" aria-busy={result?.revision !== revision}>
      <div className="section-heading"><div><p className="eyebrow">All characters</p><h2>Account boss income</h2></div></div>
      {result?.error ? <p role="alert">{result.error}</p> : income ? <>
        <div className="boss-summary">
          <article><span>Weekly plan</span><strong>{formatMeso(income.weeklyPlan)}</strong><small>{income.plannedCrystals} / {ACCOUNT_CRYSTAL_LIMIT} crystals planned</small></article>
          <article><span>Earned this week</span><strong>{formatMeso(income.weeklyCleared)}</strong><small>{income.clearedCrystals} / {ACCOUNT_CRYSTAL_LIMIT} crystals cleared</small></article>
          <article><span>Monthly boss plan</span><strong>{formatMeso(income.monthlyPlan)}</strong><small>{formatMeso(income.monthlyCleared)} earned this month</small></article>
          <article><span>Monthly projection</span><strong>{formatMeso(income.monthlyProjection)}</strong><small>4.345 weeks + monthly bosses</small></article>
        </div>
        <p className="muted">Highest 14 weekly crystal payouts per character, then highest 180 across your account, after party splits. Monthly bosses are separate.</p>
        {income.selectedWeekly > income.plannedCrystals && <p className="muted">{income.selectedWeekly - income.plannedCrystals} selected weekly crystals are outside the income limits.</p>}
      </> : <p role="status">Loading account income…</p>}
    </section>
  );
}
