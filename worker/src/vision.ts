import { HttpError } from "./http";
import type { Env, EquipmentSlot } from "./types";
import { EQUIPMENT_SLOTS } from "./types";
import { deriveFlameScoreLines, isSweetwaterItem, preferredFlameStats } from "./equipment/calculators";
import { isSkillRing, loadCatalogFacts, type CatalogEquipmentFacts, type ParsedEquipmentText } from "./equipment/domain";
import { parseEquipmentText } from "./equipment/parser";
import { formatStatEquivalencies, parseStatEquivalencyText, type StatEquivalency } from "./equipment/stat-equivalencies";

const MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function imageFromForm(form: FormData): File {
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "An image file is required.");
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new HttpError(400, "Upload must be a PNG, JPEG, or WEBP image.");
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "Image must be 8 MB or smaller.");
  return file;
}

function extractText(result: unknown): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    const record = result as Record<string, unknown>;
    for (const key of ["response", "result", "text", "description"]) {
      if (typeof record[key] === "string") return record[key] as string;
    }
  }
  throw new Error("Vision model returned an unsupported response.");
}

function extractJson(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const parsed = JSON.parse(candidate);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Vision response was not an object.");
  return parsed as Record<string, unknown>;
}

async function runVision(env: Env, file: File, prompt: string): Promise<Record<string, unknown>> {
  const image = [...new Uint8Array(await file.arrayBuffer())];
  const result = await env.AI.run(MODEL, { image, prompt, max_tokens: 1800 });
  return extractJson(extractText(result));
}

function text(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function nullableInt(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}

export async function extractEquipment(env: Env, form: FormData) {
  const file = imageFromForm(form);
  let data: Record<string, unknown>;
  try {
    data = await runVision(env, file, `Read this MapleStory equipment tooltip. Return only valid JSON with these keys: rawExtractedText, starForce, colorFlameStats, slot, name, levelRequirement, statLines, potentialTier, potentialLines, bonusPotentialTier, bonusPotentialLines. Transcribe rawExtractedText line-for-line, including parenthetical base/Star Force/bonus components. Count only filled enhancement stars. colorFlameStats must contain only the right-most green/cyan bonus-stat components as newline-separated "Stat: +Value" lines. slot, if known, must be one of ${EQUIPMENT_SLOTS.join(", ")}. Use null for unknown numbers and empty strings for unknown text. Do not calculate flame tiers and do not invent unreadable values.`);
  } catch (error) {
    console.error("Workers AI equipment extraction failed", error);
    return failedEquipmentDraft(file, "WORKERS_AI_UNAVAILABLE", "Screenshot extraction is temporarily unavailable. Fill the review fields manually.");
  }
  const rawText = text(data.rawExtractedText) || text(data.rawText);
  const starForce = nullableInt(data.starForce, 0, 25);
  let catalog: CatalogEquipmentFacts[];
  try {
    catalog = await loadCatalogFacts(env.DB);
  } catch (error) {
    console.error("Equipment catalog lookup failed", error);
    catalog = [];
  }
  const parsed = parseEquipmentText(rawText, starForce, catalog);
  const aiSlot = EQUIPMENT_SLOTS.includes(data.slot as EquipmentSlot) ? data.slot as EquipmentSlot : null;
  const merged: ParsedEquipmentText = {
    ...parsed,
    slot: parsed.slot ?? aiSlot,
    name: parsed.name || text(data.name) || "Unknown equipment",
    levelRequirement: parsed.levelRequirement ?? nullableInt(data.levelRequirement, 0, 300),
    statLines: parsed.statLines || text(data.statLines),
    potentialTier: parsed.potentialTier || text(data.potentialTier),
    potentialLines: parsed.potentialLines || text(data.potentialLines),
    bonusPotentialTier: parsed.bonusPotentialTier || text(data.bonusPotentialTier),
    bonusPotentialLines: parsed.bonusPotentialLines || text(data.bonusPotentialLines),
  };
  const skillRing = isSkillRing(merged.name) || isSkillRing(rawText);
  const pocket = merged.slot === "POCKET";
  const sweetwater = isSweetwaterItem(merged.name);
  const skipStars = skillRing || pocket;
  const skipFlames = skillRing || sweetwater;
  const skipPotential = skillRing || pocket;
  const colorFlames = text(data.colorFlameStats) || text(data.flameStats);
  const flameStats = skipFlames ? "" : preferredFlameStats({ ...merged, starForce: skipStars ? 0 : starForce }, colorFlames, catalog);
  const calculated = { ...merged, starForce: skipStars ? 0 : starForce, flameStats };
  const flameScoreLines = skipFlames ? "" : deriveFlameScoreLines(calculated, catalog);
  const status = ["WORKERS_AI_OCR_COMPLETED", skipStars ? "STARFORCE_SKIPPED" : "STARFORCE_COMPLETED",
    skipFlames ? "FLAMES_SKIPPED" : "FLAMES_COMPLETED", skipPotential ? "POTENTIAL_SKIPPED" : "POTENTIAL_COMPLETED"].join("+");
  return {
    originalFilename: file.name,
    imageBytes: file.size,
    slot: merged.slot ?? "RING",
    slotIndex: null,
    name: merged.name,
    levelRequirement: merged.levelRequirement,
    starForce: skipStars ? 0 : starForce,
    statLines: merged.statLines,
    flameStats,
    flameScoreLines,
    potentialTier: skipPotential ? "" : merged.potentialTier,
    potentialLines: skipPotential ? "" : merged.potentialLines,
    bonusPotentialTier: skipPotential ? "" : merged.bonusPotentialTier,
    bonusPotentialLines: skipPotential ? "" : merged.bonusPotentialLines,
    rawExtractedText: rawText,
    extractionStatus: status,
    extractionNotes: "Workers AI transcribed the screenshot; legacy-compatible deterministic parsing and calculations were applied. Review values before saving.",
  };
}

function failedEquipmentDraft(file: File, status: string, notes: string) {
  return {
    originalFilename: file.name, imageBytes: file.size, slot: "RING" as EquipmentSlot, slotIndex: null,
    name: "Unknown equipment", levelRequirement: null, starForce: null, statLines: "", flameStats: "",
    flameScoreLines: "", potentialTier: "", potentialLines: "", bonusPotentialTier: "",
    bonusPotentialLines: "", rawExtractedText: "", extractionStatus: status, extractionNotes: notes,
  };
}

export async function extractStatEquivalencies(env: Env, form: FormData) {
  const file = imageFromForm(form);
  let data: Record<string, unknown>;
  try {
    data = await runVision(env, file, "Transcribe this MapleStory stat-equivalency table line-for-line. Return only valid JSON: {\"rawText\":string,\"equivalencies\":[{\"stat\":string,\"quantity\":integer,\"finalDamagePercent\":number}]}. Preserve percent signs and decimals. Do not invent unreadable rows.");
  } catch (error) {
    console.error("Workers AI stat-equivalency extraction failed", error);
    return { equivalencies: [], lines: "", rawText: "", extractionStatus: "STAT_EQUIVALENCIES_UNAVAILABLE",
      extractionNotes: "Stat-equivalency extraction is temporarily unavailable." };
  }
  const rawText = text(data.rawText);
  let equivalencies = parseStatEquivalencyText(rawText);
  const aiRows = Array.isArray(data.equivalencies) ? data.equivalencies : [];
  const fallback = aiRows.flatMap((row): StatEquivalency[] => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    const stat = text(item.stat);
    const quantity = nullableInt(item.quantity, 0, 1_000_000);
    const finalDamagePercent = Number(item.finalDamagePercent);
    return stat && quantity != null && Number.isFinite(finalDamagePercent) ? [{ stat, quantity, finalDamagePercent }] : [];
  });
  if (equivalencies.length === 0) equivalencies = fallback;
  return {
    equivalencies,
    lines: formatStatEquivalencies(equivalencies),
    rawText,
    extractionStatus: "STAT_EQUIVALENCIES_COMPLETED",
    extractionNotes: `Workers AI transcribed the image; legacy-compatible parsing found ${equivalencies.length} table row(s).`,
  };
}
