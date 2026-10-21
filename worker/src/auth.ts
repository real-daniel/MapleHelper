import { createMiddleware } from "hono/factory";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";
import type { AppBindings, AuthenticatedUser } from "./types";
import { HttpError } from "./http";

const SESSION_COOKIE = "MAPLEHELPER_SESSION";
const OAUTH_STATE_COOKIE = "MAPLEHELPER_OAUTH_STATE";
const CSRF_COOKIE = "MAPLEHELPER_CSRF";
const SESSION_SECONDS = 7 * 24 * 60 * 60;

function randomToken(bytes = 32): string {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...data)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function cookieOptions(c: Context<AppBindings>, maxAge: number) {
  return { httpOnly: true, secure: c.env.APP_URL.startsWith("https://"), sameSite: "Lax" as const, path: "/", maxAge };
}

export const requireAuth = createMiddleware<AppBindings>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) throw new HttpError(401, "Authentication is required.");

  const row = await c.env.DB.prepare(`
    SELECT u.id, u.discord_user_id, u.username, u.display_name, u.avatar_url
    FROM sessions s JOIN app_users u ON u.id = s.app_user_id
    WHERE s.id_hash = ? AND s.expires_at > ?
  `).bind(await sha256(token), new Date().toISOString()).first<Record<string, unknown>>();
  if (!row) {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    throw new HttpError(401, "Authentication is required.");
  }
  c.set("user", {
    id: Number(row.id),
    discordUserId: String(row.discord_user_id),
    username: String(row.username),
    displayName: String(row.display_name),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
  });
  await next();
});

export const requireCsrf = createMiddleware<AppBindings>(async (c, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(c.req.method)) return next();
  const cookie = getCookie(c, CSRF_COOKIE);
  const header = c.req.header("X-XSRF-TOKEN");
  if (!cookie || !header || cookie !== header) throw new HttpError(403, "Invalid CSRF token.");
  await next();
});

export function issueCsrf(c: Context<AppBindings>) {
  const token = getCookie(c, CSRF_COOKIE) ?? randomToken();
  setCookie(c, CSRF_COOKIE, token, cookieOptions(c, SESSION_SECONDS));
  return c.json({ token, headerName: "X-XSRF-TOKEN" });
}

export function beginDiscordLogin(c: Context<AppBindings>) {
  const state = randomToken();
  setCookie(c, OAUTH_STATE_COOKIE, state, cookieOptions(c, 600));
  const redirectUri = `${c.env.APP_URL.replace(/\/$/, "")}/login/oauth2/code/discord`;
  const url = new URL("https://discord.com/oauth2/authorize");
  url.search = new URLSearchParams({ client_id: c.env.DISCORD_CLIENT_ID, response_type: "code", redirect_uri: redirectUri, scope: "identify", state }).toString();
  return c.redirect(url.toString());
}

export async function finishDiscordLogin(c: Context<AppBindings>) {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const expectedState = getCookie(c, OAUTH_STATE_COOKIE);
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: "/" });
  if (!code || !state || !expectedState || state !== expectedState) return c.redirect(`${c.env.APP_URL}/?login=error`);

  const redirectUri = `${c.env.APP_URL.replace(/\/$/, "")}/login/oauth2/code/discord`;
  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: c.env.DISCORD_CLIENT_ID, client_secret: c.env.DISCORD_CLIENT_SECRET, grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  if (!tokenResponse.ok) return c.redirect(`${c.env.APP_URL}/?login=error`);
  const token = await tokenResponse.json<{ access_token: string }>();
  const userResponse = await fetch("https://discord.com/api/v10/users/@me", { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (!userResponse.ok) return c.redirect(`${c.env.APP_URL}/?login=error`);
  const discord = await userResponse.json<{ id: string; username: string; global_name?: string | null; avatar?: string | null }>();
  const now = new Date().toISOString();
  const avatarUrl = discord.avatar ? `https://cdn.discordapp.com/avatars/${discord.id}/${discord.avatar}.png?size=128` : null;
  await c.env.DB.prepare(`
    INSERT INTO app_users(discord_user_id, username, display_name, avatar_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(discord_user_id) DO UPDATE SET username=excluded.username, display_name=excluded.display_name,
      avatar_url=excluded.avatar_url, updated_at=excluded.updated_at
  `).bind(discord.id, discord.username, discord.global_name || discord.username, avatarUrl, now, now).run();
  const user = await c.env.DB.prepare("SELECT id FROM app_users WHERE discord_user_id = ?").bind(discord.id).first<{ id: number }>();
  if (!user) throw new Error("Discord user upsert did not return a user.");

  const sessionToken = randomToken();
  const expires = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now),
    c.env.DB.prepare("INSERT INTO sessions(id_hash, app_user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .bind(await sha256(sessionToken), user.id, expires, now),
  ]);
  setCookie(c, SESSION_COOKIE, sessionToken, cookieOptions(c, SESSION_SECONDS));
  return c.redirect(c.env.APP_URL);
}

export async function logout(c: Context<AppBindings>) {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await c.env.DB.prepare("DELETE FROM sessions WHERE id_hash = ?").bind(await sha256(token)).run();
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.body(null, 204);
}

export function currentUser(c: Context<AppBindings>): AuthenticatedUser {
  return c.get("user");
}
