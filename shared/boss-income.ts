export type BossPlanEntry = {
  bossKey: string;
  bossName: string;
  difficulty: string;
  resetPeriod: "WEEKLY" | "MONTHLY";
  crystalValue: number;
  partySize: number;
  tracked: boolean;
  cleared: boolean;
};

export const CHARACTER_CRYSTAL_LIMIT = 14;
export const ACCOUNT_CRYSTAL_LIMIT = 180;

export function personalCrystalIncome(crystalValue: number, partySize: number) {
  return Math.floor(Math.max(0, crystalValue) / Math.min(6, Math.max(1, partySize)));
}

export function countedWeeklyBosses<T extends BossPlanEntry>(entries: T[], clearedOnly = false, limit = CHARACTER_CRYSTAL_LIMIT): T[] {
  return entries.filter((entry) => entry.tracked && entry.resetPeriod === "WEEKLY" && (!clearedOnly || entry.cleared))
    .sort((a, b) => personalCrystalIncome(b.crystalValue, b.partySize) - personalCrystalIncome(a.crystalValue, a.partySize)
      || a.bossKey.localeCompare(b.bossKey))
    .slice(0, limit);
}

function summarize(entries: BossPlanEntry[], planned: BossPlanEntry[], earned: BossPlanEntry[]) {
  const sum = (rows: BossPlanEntry[]) => rows.reduce((total, row) => total + personalCrystalIncome(row.crystalValue, row.partySize), 0);
  const monthly = entries.filter((row) => row.tracked && row.resetPeriod === "MONTHLY");
  const weeklyPlan = sum(planned);
  const monthlyPlan = sum(monthly);
  return {
    weeklyPlan,
    weeklyCleared: sum(earned),
    monthlyPlan,
    monthlyCleared: sum(monthly.filter((row) => row.cleared)),
    monthlyProjection: weeklyPlan * 4.345 + monthlyPlan,
    plannedCrystals: planned.length,
    clearedCrystals: earned.length,
    selectedWeekly: entries.filter((row) => row.tracked && row.resetPeriod === "WEEKLY").length,
    planned: entries.filter((row) => row.tracked).length,
    cleared: entries.filter((row) => row.tracked && row.cleared).length,
  };
}

export function characterBossIncome(entries: BossPlanEntry[]) {
  return summarize(entries, countedWeeklyBosses(entries), countedWeeklyBosses(entries, true));
}

export function accountBossIncome(entries: (BossPlanEntry & { characterProfileId: number })[]) {
  const characters = new Map<number, BossPlanEntry[]>();
  for (const row of entries) {
    const rows = characters.get(row.characterProfileId) ?? [];
    rows.push(row);
    characters.set(row.characterProfileId, rows);
  }
  const planned = [...characters.values()].flatMap((rows) => countedWeeklyBosses(rows));
  const earned = [...characters.values()].flatMap((rows) => countedWeeklyBosses(rows, true));
  return summarize(entries, countedWeeklyBosses(planned, false, ACCOUNT_CRYSTAL_LIMIT), countedWeeklyBosses(earned, true, ACCOUNT_CRYSTAL_LIMIT));
}
