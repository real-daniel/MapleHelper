import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import app from "../src/index";

// Exercise the real route SQL and migrations against an isolated SQLite database.
function d1(database) {
  return {
    prepare(sql) {
      const make = (values = []) => ({
        bind: (...next) => make(next),
        async first() { return database.prepare(sql).get(...values) ?? null; },
        async all() { return { results: database.prepare(sql).all(...values) }; },
        async run() {
          const result = database.prepare(sql).run(...values);
          return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
        },
      });
      return make();
    },
    async batch(statements) {
      database.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        database.exec("COMMIT");
        return results;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

describe("saved boss presets and account API", () => {
  let database;
  let env;
  const entry = { bossKey: "lotus", bossName: "Lotus", difficulty: "Hard", resetPeriod: "WEEKLY",
    crystalValue: 600, partySize: 3, tracked: true, cleared: true };

  beforeEach(async () => {
    database = new DatabaseSync(":memory:");
    database.exec("PRAGMA foreign_keys=ON");
    for (const file of ["0001_initial.sql", "0004_boss_tracker.sql", "0005_boss_presets.sql", "0019_character_stat_equivalencies.sql"]) {
      database.exec(readFileSync(new URL(`../../migrations/${file}`, import.meta.url), "utf8"));
    }
    for (const id of [1, 2]) {
      database.prepare(`INSERT INTO app_users(id,discord_user_id,username,display_name,created_at,updated_at)
        VALUES (?,?,?,?,?,?)`).run(id, `discord-${id}`, `user-${id}`, `User ${id}`, "now", "now");
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`session-${id}`));
      const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      database.prepare("INSERT INTO sessions VALUES (?,?,?,?)").run(hash, id, "2099-01-01", "now");
    }
    for (const [id, user] of [[1, 1], [2, 1], [3, 2]]) {
      database.prepare(`INSERT INTO character_profiles(id,app_user_id,name,world,job,region,source_url,retrieved_at,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)`).run(id, user, `Character${id}`, "Kronos", "Hero", "NORTH_AMERICA", "https://example.com", "now", "now", "now");
    }
    env = { DB: d1(database), APP_URL: "http://localhost:8787" };
  });

  afterEach(() => database.close());

  function request(path, method = "GET", body, user = 1) {
    return app.request(`/api/v1/boss-tracker${path}`, {
      method,
      headers: { Cookie: `MAPLEHELPER_SESSION=session-${user}; MAPLEHELPER_CSRF=test`, "X-XSRF-TOKEN": "test", "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }, env);
  }

  async function savePreset() {
    const response = await request("/presets", "POST", { characterProfileId: 1, name: "Weekly mule", entries: [entry] });
    expect(response.status).toBe(201);
    return response.json();
  }

  it("persists character stat equivalencies and isolates them by account", async () => {
    const response = await app.request("/api/v1/profiles/1/stat-equivalencies", {
      method: "PUT",
      headers: { Cookie: "MAPLEHELPER_SESSION=session-1; MAPLEHELPER_CSRF=test", "X-XSRF-TOKEN": "test", "Content-Type": "application/json" },
      body: JSON.stringify({ equivalencies: [{ stat: "STR", quantity: 30, finalDamagePercent: 0.235 }] }),
    }, env);
    expect(response.status).toBe(200);
    expect((await response.json()).statEquivalencies).toEqual([{ stat: "STR", quantity: 30, finalDamagePercent: 0.235 }]);

    const otherAccount = await app.request("/api/v1/profiles/1/stat-equivalencies", {
      method: "PUT",
      headers: { Cookie: "MAPLEHELPER_SESSION=session-2; MAPLEHELPER_CSRF=test", "X-XSRF-TOKEN": "test", "Content-Type": "application/json" },
      body: JSON.stringify({ equivalencies: [] }),
    }, env);
    expect(otherAccount.status).toBe(404);
  });

  it("rejects duplicate or unbounded character stat equivalencies", async () => {
    const headers = { Cookie: "MAPLEHELPER_SESSION=session-1; MAPLEHELPER_CSRF=test", "X-XSRF-TOKEN": "test", "Content-Type": "application/json" };
    const duplicate = await app.request("/api/v1/profiles/1/stat-equivalencies", {
      method: "PUT", headers,
      body: JSON.stringify({ equivalencies: [{ stat: "STR", quantity: 30, finalDamagePercent: 1 }, { stat: "str", quantity: 40, finalDamagePercent: 2 }] }),
    }, env);
    expect(duplicate.status).toBe(400);

    const oversized = await app.request("/api/v1/profiles/1/stat-equivalencies", {
      method: "PUT", headers,
      body: JSON.stringify({ equivalencies: [{ stat: "STR", quantity: 1_000_001, finalDamagePercent: 1 }] }),
    }, env);
    expect(oversized.status).toBe(400);
  });

  it("persists reusable settings, applies to another character, and isolates accounts", async () => {
    const preset = await savePreset();
    expect(await (await request("/presets")).json()).toEqual([{ id: preset.id, name: "Weekly mule" }]);
    expect(await (await request("/presets", "GET", undefined, 2)).json()).toEqual([]);
    expect((await request(`/presets/${preset.id}/apply`, "POST", { characterProfileId: 3 }, 2)).status).toBe(404);
    expect((await request(`/presets/${preset.id}/apply`, "POST", { characterProfileId: 3 })).status).toBe(404);
    const applied = await request(`/presets/${preset.id}/apply`, "POST", { characterProfileId: 2 });
    expect(applied.status).toBe(200);
    expect(await applied.json()).toEqual([expect.objectContaining({ ...entry, cleared: false })]);
    const reloaded = await (await request("?characterProfileId=2")).json();
    expect(reloaded[0].partySize).toBe(3);
    const summary = await (await request("/account")).json();
    expect(summary.weeklyPlan).toBe(200);
    expect(summary.weeklyCleared).toBe(0);
    expect((await (await request("/account", "GET", undefined, 2)).json()).weeklyPlan).toBe(0);
  });

  it("replaces selections atomically, retains matching clears, and does not copy source clears", async () => {
    const preset = await savePreset();
    expect((await request("", "PUT", { characterProfileId: 2, ...entry })).status).toBe(200);
    expect((await request("", "PUT", { characterProfileId: 2, ...entry, bossKey: "damien", bossName: "Damien" })).status).toBe(200);
    const applied = await (await request(`/presets/${preset.id}/apply`, "POST", { characterProfileId: 2 })).json();
    expect(applied.find((row) => row.bossKey === "lotus").cleared).toBe(true);
    expect(applied.find((row) => row.bossKey === "damien")).toMatchObject({ tracked: false, cleared: false });
  });

  it("rejects duplicate names without overwriting and validates preset input", async () => {
    await savePreset();
    expect((await request("/presets", "POST", { characterProfileId: 1, name: "WEEKLY MULE", entries: [entry] })).status).toBe(409);
    expect((await request("/presets", "POST", { characterProfileId: 1, name: "Empty", entries: [] })).status).toBe(400);
    expect((await request("/presets", "POST", { characterProfileId: 1, name: "Bad", entries: [{ ...entry, partySize: 7 }] })).status).toBe(400);
  });

  it("requires authentication and CSRF for preset changes", async () => {
    expect((await app.request("/api/v1/boss-tracker/presets", {}, env)).status).toBe(401);
    const response = await app.request("/api/v1/boss-tracker/presets", { method: "POST", headers: { Cookie: "MAPLEHELPER_SESSION=session-1" } }, env);
    expect(response.status).toBe(403);
    for (const [path, method] of [["/presets/1", "PUT"], ["/presets/1", "DELETE"], ["/clear-all", "POST"]]) {
      const response = await app.request(`/api/v1/boss-tracker${path}`, { method, headers: { Cookie: "MAPLEHELPER_SESSION=session-1" } }, env);
      expect(response.status).toBe(403);
      expect((await app.request(`/api/v1/boss-tracker${path}`, { method }, env)).status).toBe(401);
    }
  });

  it("renames a preset without changing its saved bosses", async () => {
    const preset = await savePreset();
    const response = await request(`/presets/${preset.id}`, "PUT", { name: "  Main weekly  " });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: preset.id, name: "Main weekly" });
    expect(await (await request("/presets")).json()).toEqual([{ id: preset.id, name: "Main weekly" }]);
    const applied = await (await request(`/presets/${preset.id}/apply`, "POST", { characterProfileId: 2 })).json();
    expect(applied).toEqual([expect.objectContaining({ ...entry, cleared: false })]);
  });

  it("updates preset settings without changing character plans until applied", async () => {
    const preset = await savePreset();
    await request("", "PUT", { characterProfileId: 2, ...entry });
    const replacement = { ...entry, bossKey: "damien", bossName: "Damien", crystalValue: 900, partySize: 2 };
    const response = await request(`/presets/${preset.id}`, "PUT", { name: preset.name, entries: [replacement] });
    expect(response.status).toBe(200);
    expect((await (await request("?characterProfileId=2")).json())[0]).toMatchObject({ ...entry });
    const applied = await (await request(`/presets/${preset.id}/apply`, "POST", { characterProfileId: 2 })).json();
    expect(applied.find((row) => row.bossKey === "damien")).toMatchObject({ ...replacement, cleared: false });
    expect(applied.find((row) => row.bossKey === "lotus")).toMatchObject({ tracked: false, cleared: false });
  });

  it("rejects invalid edits and duplicate names without overwriting a preset", async () => {
    const preset = await savePreset();
    await request("/presets", "POST", { characterProfileId: 1, name: "Other", entries: [entry] });
    expect((await request(`/presets/${preset.id}`, "PUT", { name: "OTHER", entries: [{ ...entry, partySize: 1 }] })).status).toBe(409);
    for (const body of [{ name: " " }, { name: "Updated", entries: [] }, { name: "Updated", entries: [{ ...entry, partySize: 7 }] }]) {
      expect((await request(`/presets/${preset.id}`, "PUT", body)).status).toBe(400);
    }
    expect((await (await request("/presets")).json()).find((row) => row.id === preset.id).name).toBe(preset.name);
    const applied = await (await request(`/presets/${preset.id}/apply`, "POST", { characterProfileId: 2 })).json();
    expect(applied[0].partySize).toBe(3);
  });

  it("deletes presets without deleting or changing saved character plans", async () => {
    const preset = await savePreset();
    await request(`/presets/${preset.id}/apply`, "POST", { characterProfileId: 2 });
    expect((await request(`/presets/${preset.id}`, "DELETE")).status).toBe(204);
    expect(await (await request("/presets")).json()).toEqual([]);
    expect((await request(`/presets/${preset.id}`, "DELETE")).status).toBe(404);
    expect((await request(`/presets/${preset.id}/apply`, "POST", { characterProfileId: 2 })).status).toBe(404);
    expect((await (await request("?characterProfileId=2")).json())[0]).toMatchObject({ ...entry, cleared: false });
  });

  it("isolates preset edits and deletion by account and handles missing presets", async () => {
    const preset = await savePreset();
    expect((await request(`/presets/${preset.id}`, "PUT", { name: "Stolen" }, 2)).status).toBe(404);
    expect((await request(`/presets/${preset.id}`, "DELETE", undefined, 2)).status).toBe(404);
    expect((await request("/presets/999", "PUT", { name: "Missing" })).status).toBe(404);
    expect(await (await request("/presets")).json()).toEqual([{ id: preset.id, name: preset.name }]);
  });

  it("clears all selected bosses for only the current character and refreshes earned income", async () => {
    await request("", "PUT", { characterProfileId: 1, ...entry, cleared: false });
    await request("", "PUT", { characterProfileId: 1, ...entry, bossKey: "damien", tracked: false, cleared: false });
    await request("", "PUT", { characterProfileId: 2, ...entry, cleared: false });
    expect((await request("/clear-all", "POST", { characterProfileId: 1 })).status).toBe(200);
    expect((await request("/clear-all", "POST", { characterProfileId: 1 })).status).toBe(200);
    const rows = await (await request("?characterProfileId=1")).json();
    expect(rows.find((row) => row.bossKey === "lotus")).toMatchObject({ ...entry });
    expect(rows.find((row) => row.bossKey === "damien")).toMatchObject({ tracked: false, cleared: false });
    expect((await (await request("?characterProfileId=2")).json())[0].cleared).toBe(false);
    expect((await (await request("/account")).json()).weeklyCleared).toBe(200);
    expect((await request("/clear-all", "POST", { characterProfileId: 3 })).status).toBe(404);
    expect((await request("/clear-all", "POST", { characterProfileId: 1 }, 2)).status).toBe(404);
    expect((await request("/clear-all", "POST", {})).status).toBe(400);
  });

  it("returns account totals after both weekly caps while leaving monthly crystals separate", async () => {
    for (let profileId = 10; profileId < 23; profileId++) {
      database.prepare(`INSERT INTO character_profiles(id,app_user_id,name,world,job,region,source_url,retrieved_at,created_at,updated_at)
        VALUES (?,1,?,'Kronos','Hero','NORTH_AMERICA','https://example.com','now','now','now')`).run(profileId, `Mule${profileId}`);
      for (let value = 1; value <= 15; value++) {
        database.prepare(`INSERT INTO boss_tracker_entries VALUES (1,?,?,?,?,?,?,?,?,?,'now','now')`)
          .run(profileId, `boss-${value}`, `Boss ${value}`, "Normal", "WEEKLY", value * 100, 1, 1, 1);
      }
    }
    expect((await request("", "PUT", { characterProfileId: 1, ...entry, resetPeriod: "MONTHLY" })).status).toBe(200);
    const summary = await (await request("/account")).json();
    expect(summary.plannedCrystals).toBe(180);
    expect(summary.clearedCrystals).toBe(180);
    expect(summary.weeklyPlan).toBe(154_300);
    expect(summary.weeklyCleared).toBe(154_300);
    expect(summary.monthlyPlan).toBe(200);
    expect(summary.monthlyCleared).toBe(200);
  });

  it("rolls back the entire preset application if one write fails", async () => {
    const preset = await savePreset();
    await request("", "PUT", { characterProfileId: 2, ...entry, bossKey: "damien", bossName: "Damien" });
    database.exec(`CREATE TRIGGER reject_lotus BEFORE INSERT ON boss_tracker_entries
      WHEN NEW.boss_key='lotus' BEGIN SELECT RAISE(ABORT,'test write failure'); END`);
    const response = await request(`/presets/${preset.id}/apply`, "POST", { characterProfileId: 2 });
    expect(response.status).toBe(500);
    const rows = await (await request("?characterProfileId=2")).json();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ bossKey: "damien", tracked: true, cleared: true });
  });
});
