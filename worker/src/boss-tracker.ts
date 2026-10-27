import { asObject, booleanValue, HttpError, integerValue, stringValue } from "./http";
import type { BossPlanEntry } from "../../shared/boss-income";

export function parseBossEntry(value: unknown): BossPlanEntry {
  const body = asObject(value);
  const bossKey = stringValue(body.bossKey, "bossKey", 80, true)!;
  if (!/^[a-z0-9-]+$/.test(bossKey)) throw new HttpError(400, "bossKey is invalid.");
  const bossName = stringValue(body.bossName, "bossName", 80, true)!;
  const difficulty = stringValue(body.difficulty, "difficulty", 30, true)!;
  const resetPeriod = body.resetPeriod;
  if (resetPeriod !== "WEEKLY" && resetPeriod !== "MONTHLY") throw new HttpError(400, "resetPeriod is invalid.");
  const crystalValue = integerValue(body.crystalValue, "crystalValue", 0, 100_000_000_000);
  const partySize = integerValue(body.partySize, "partySize", 1, 6);
  if (crystalValue == null || partySize == null) throw new HttpError(400, "crystalValue and partySize are required.");
  const tracked = booleanValue(body.tracked, "tracked");
  const cleared = booleanValue(body.cleared, "cleared") && tracked;
  return { bossKey, bossName, difficulty, resetPeriod, crystalValue, partySize, tracked, cleared };
}

export function parsePresetEntries(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    throw new HttpError(400, "Select between 1 and 100 bosses to save a preset.");
  }
  const entries = value.map((entry) => parseBossEntry({ ...asObject(entry), tracked: true, cleared: false }));
  if (new Set(entries.map((entry) => entry.bossKey)).size !== entries.length) {
    throw new HttpError(400, "A preset cannot contain duplicate bosses.");
  }
  return entries;
}
