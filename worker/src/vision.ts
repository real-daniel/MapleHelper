import { HttpError } from "./http";
import type { Env, EquipmentSlot } from "./types";
import { EQUIPMENT_SLOTS } from "./types";

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
  const data = await runVision(env, file, `You extract fields from a MapleStory equipment tooltip screenshot. Return only valid JSON with these keys: slot, name, levelRequirement, starForce, statLines, flameStats, flameScoreLines, potentialTier, potentialLines, bonusPotentialTier, bonusPotentialLines, rawExtractedText. slot must be one of ${EQUIPMENT_SLOTS.join(", ")}. Preserve tooltip lines as newline-separated text. Green bonus-stat values belong in flameStats. Count only filled enhancement stars. Use null for unknown numbers and empty strings for unknown text. Do not invent values.`);
  const slot = EQUIPMENT_SLOTS.includes(data.slot as EquipmentSlot) ? data.slot as EquipmentSlot : "RING";
  return {
    originalFilename: file.name,
    imageBytes: file.size,
    slot,
    slotIndex: null,
    name: text(data.name) || "Unknown equipment",
    levelRequirement: nullableInt(data.levelRequirement, 0, 300),
    starForce: nullableInt(data.starForce, 0, 25),
    statLines: text(data.statLines),
    flameStats: text(data.flameStats),
    flameScoreLines: text(data.flameScoreLines),
    potentialTier: text(data.potentialTier),
    potentialLines: text(data.potentialLines),
    bonusPotentialTier: text(data.bonusPotentialTier),
    bonusPotentialLines: text(data.bonusPotentialLines),
    rawExtractedText: text(data.rawExtractedText),
    extractionStatus: "WORKERS_AI_COMPLETED",
    extractionNotes: "Workers AI extracted the screenshot. Review values before saving.",
  };
}

export async function extractStatEquivalencies(env: Env, form: FormData) {
  const file = imageFromForm(form);
  const data = await runVision(env, file, "Extract the stat-equivalency table from this MapleStory screenshot. Return only valid JSON: {\"equivalencies\":[{\"stat\":string,\"quantity\":integer,\"finalDamagePercent\":number}],\"lines\":string,\"rawText\":string}. Do not invent unreadable rows.");
  const rows = Array.isArray(data.equivalencies) ? data.equivalencies : [];
  const equivalencies = rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    const stat = text(item.stat);
    const quantity = nullableInt(item.quantity, 0, 1_000_000);
    const finalDamagePercent = Number(item.finalDamagePercent);
    return stat && quantity != null && Number.isFinite(finalDamagePercent) ? [{ stat, quantity, finalDamagePercent }] : [];
  });
  return {
    equivalencies,
    lines: text(data.lines),
    rawText: text(data.rawText),
    extractionStatus: "STAT_EQUIVALENCIES_COMPLETED",
    extractionNotes: `Workers AI found ${equivalencies.length} table row(s).`,
  };
}
