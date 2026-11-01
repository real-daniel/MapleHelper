import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

describe("equipment catalog API", () => {
  let database;
  let env;

  beforeEach(async () => {
    database = new DatabaseSync(":memory:");
    for (const file of ["0001_initial.sql", "0006_equipment_presets.sql", "0007_astra_secondary_stage.sql", "0008_catalog_item_identity.sql"]) {
      database.exec(readFileSync(new URL(`../../migrations/${file}`, import.meta.url), "utf8"));
    }
    database.prepare(`INSERT INTO app_users(id,discord_user_id,username,display_name,created_at,updated_at)
      VALUES (1,'discord-1','user-1','User 1','now','now')`).run();
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("session-1"));
    const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    database.prepare("INSERT INTO sessions VALUES (?,?,?,?)").run(hash, 1, "2099-01-01", "now");
    database.exec("DELETE FROM equipment_catalog_items");
    const insert = database.prepare("INSERT INTO equipment_catalog_items(slot,name,job_group) VALUES (?,?,?)");
    for (const group of ["Warrior", "Magician", "Bowman", "Thief", "Pirate"]) insert.run("HAT", `Eternal ${group} Hat`, group);
    insert.run("HAT", "Universal Hat", null);
    database.prepare("UPDATE equipment_catalog_items SET base_stats=?,star_force_profile='ARMOR_ACCESSORY',set_name='Eternal',maple_item_id=1005982 WHERE name='Eternal Bowman Hat'")
      .run('{"DEX":50,"Attack Power":6}');
    env = { DB: d1(database), APP_URL: "http://localhost:8787" };
  });

  afterEach(() => database.close());

  function request(path) {
    return app.request(`/api/v1/equipment/catalog${path}`, {
      headers: { Cookie: "MAPLEHELPER_SESSION=session-1" },
    }, env);
  }

  it.each(["Warrior", "Magician", "Bowman", "Thief", "Pirate"])("returns only universal and %s equipment", async (group) => {
    const response = await request(`?slot=HAT&jobGroup=${group}`);
    expect(response.status).toBe(200);
    expect((await response.json()).map((item) => item.name)).toEqual([`Eternal ${group} Hat`, "Universal Hat"]);
  });

  it("supports classes with multiple equipment groups", async () => {
    const response = await request("?slot=HAT&jobGroup=Thief,Pirate");
    expect(response.status).toBe(200);
    expect((await response.json()).map((item) => item.name)).toEqual(["Eternal Pirate Hat", "Eternal Thief Hat", "Universal Hat"]);
  });

  it("rejects invalid job groups", async () => {
    const response = await request("?slot=HAT&jobGroup=Beginner");
    expect(response.status).toBe(400);
  });

  it("includes parsed catalog stats for saved and legacy equipment", async () => {
    const catalogId = database.prepare("SELECT id FROM equipment_catalog_items WHERE name='Eternal Bowman Hat'").get().id;
    const insert = database.prepare(`INSERT INTO equipment_items
      (app_user_id,catalog_item_id,preset_number,slot,name,level_requirement,star_force,created_at,updated_at)
      VALUES (1,?,1,'HAT','Eternal Bowman Hat',250,22,'now','now')`);
    insert.run(catalogId);
    insert.run(null);
    const response = await app.request("/api/v1/equipment", { headers: { Cookie: "MAPLEHELPER_SESSION=session-1" } }, env);
    expect(response.status).toBe(200);
    const items = await response.json();
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      catalogBaseStats: { DEX: 50, "Attack Power": 6 }, catalogStarForceProfile: "ARMOR_ACCESSORY",
      catalogSetName: "Eternal", catalogMapleItemId: 1005982,
    });
    expect(items[1].catalogBaseStats).toEqual(items[0].catalogBaseStats);
  });
});
