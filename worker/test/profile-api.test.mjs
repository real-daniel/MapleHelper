import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import app from "../src/index";

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
  };
}

describe("character profile API", () => {
  let database;
  let env;

  beforeEach(async () => {
    database = new DatabaseSync(":memory:");
    database.exec("PRAGMA foreign_keys=ON");
    database.exec(readFileSync(new URL("../../migrations/0001_initial.sql", import.meta.url), "utf8"));
    database.prepare(`INSERT INTO app_users(id,discord_user_id,username,display_name,created_at,updated_at)
      VALUES (1,'discord-1','user-1','User 1','now','now')`).run();
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("session-1"));
    const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    database.prepare("INSERT INTO sessions VALUES (?,?,?,?)").run(hash, 1, "2099-01-01", "now");
    const insert = database.prepare(`INSERT INTO character_profiles
      (id,app_user_id,name,world,job,region,weekly_rank,weekly_experience,image_url,source_url,retrieved_at,created_at,updated_at)
      VALUES (?,1,?,'Old World','Old Job','NORTH_AMERICA',1,2,NULL,'https://old.example','old','created','old')`);
    insert.run(1, "FreshCharacter");
    insert.run(2, "UnavailableCharacter");
    env = { DB: d1(database), APP_URL: "http://localhost:8787", NEXON_BASE_URL: "https://www.nexon.com" };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    database.close();
  });

  it("refreshes every saved character from Nexon and preserves stale data on a failed refresh", async () => {
    const requestedNames = [];
    vi.stubGlobal("fetch", vi.fn(async (input) => {
      const url = new URL(input);
      const name = url.searchParams.get("character_name");
      requestedNames.push(name);
      if (name === "UnavailableCharacter") return new Response("unavailable", { status: 503 });
      return Response.json({ ranks: [{
        characterName: name,
        gap: 987654,
        rank: 42,
        worldID: 45,
        characterImgURL: "https://msavatar1.nexon.net/Character/fresh.png",
        jobName: "Hero",
        isSearchTarget: true,
      }] });
    }));

    const response = await app.request("/api/v1/profiles", {
      headers: { Cookie: "MAPLEHELPER_SESSION=session-1" },
    }, env);
    const profiles = await response.json();

    expect(response.status).toBe(200);
    expect(requestedNames.sort()).toEqual(["FreshCharacter", "UnavailableCharacter"]);
    expect(profiles).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "FreshCharacter", world: "Kronos", job: "Hero", weeklyRank: 42, weeklyExperience: 987654 }),
      expect.objectContaining({ name: "UnavailableCharacter", world: "Old World", job: "Old Job", weeklyRank: 1, weeklyExperience: 2 }),
    ]));
  });
});
