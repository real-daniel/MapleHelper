import type { Context } from "hono";
import type { AppBindings } from "./types";

export class HttpError extends Error {
  constructor(public status: 400 | 401 | 403 | 404 | 409 | 413 | 502, message: string) {
    super(message);
  }
}

export function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "Request body must be a JSON object.");
  }
  return value as Record<string, unknown>;
}

export function stringValue(value: unknown, field: string, max: number, required = false): string | null {
  if (value == null || value === "") {
    if (required) throw new HttpError(400, `${field} is required.`);
    return null;
  }
  if (typeof value !== "string") throw new HttpError(400, `${field} must be text.`);
  const clean = value.trim();
  if (required && !clean) throw new HttpError(400, `${field} is required.`);
  if (clean.length > max) throw new HttpError(400, `${field} must be ${max} characters or fewer.`);
  return clean || null;
}

export function integerValue(value: unknown, field: string, min: number, max: number): number | null {
  if (value == null || value === "") return null;
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) {
    throw new HttpError(400, `${field} must be an integer from ${min} to ${max}.`);
  }
  return Number(value);
}

export function errorResponse(c: Context<AppBindings>, error: unknown) {
  if (error instanceof HttpError) return c.json({ message: error.message }, error.status);
  console.error(error);
  return c.json({ message: "An unexpected server error occurred." }, 500);
}

export function camelRow(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
    value,
  ]));
}
