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
    for (const name of ["Fairy Heart", "Plasma Heart", "Black Heart", "Total Control"]) insert.run("HEART", name, null);
    database.exec(readFileSync(new URL("../../migrations/0011_mechanical_heart_star_force.sql", import.meta.url), "utf8"));
    database.exec(readFileSync(new URL("../../migrations/0012_level_100_class_emblems.sql", import.meta.url), "utf8"));
    database.exec(readFileSync(new URL("../../migrations/0013_level_100_adele_secondary.sql", import.meta.url), "utf8"));
    database.exec(readFileSync(new URL("../../migrations/0014_level_100_class_secondaries.sql", import.meta.url), "utf8"));
    database.exec(readFileSync(new URL("../../migrations/0015_full_astra_secondaries.sql", import.meta.url), "utf8"));
    database.exec(readFileSync(new URL("../../migrations/0016_destiny_weapon_phase.sql", import.meta.url), "utf8"));
    database.exec(readFileSync(new URL("../../migrations/0017_oz_skill_rings.sql", import.meta.url), "utf8"));
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

  it("marks enhanceable hearts for Star Force and keeps Black Heart fixed", async () => {
    const response = await request("?slot=HEART");
    expect(response.status).toBe(200);
    const hearts = await response.json();
    expect(hearts.find((item) => item.name === "Fairy Heart")?.starForceProfile).toBe("ARMOR_ACCESSORY");
    expect(hearts.find((item) => item.name === "Plasma Heart")?.starForceProfile).toBe("ARMOR_ACCESSORY");
    expect(hearts.find((item) => item.name === "Total Control")?.starForceProfile).toBe("ARMOR_ACCESSORY");
    expect(hearts.find((item) => item.name === "Black Heart")).toMatchObject({
      starForceProfile: "NONE",
      baseStats: { STR: 50, DEX: 50, INT: 50, LUK: 50, "Attack Power": 77, "Magic Attack": 77 },
    });
  });

  it("stores exact level-100 emblem family names and special base stats", () => {
    expect(database.prepare("SELECT COUNT(*) AS count FROM equipment_catalog_items WHERE slot='EMBLEM' AND level_requirement=100").get().count).toBe(26);
    expect(database.prepare("SELECT base_stats FROM equipment_catalog_items WHERE slot='EMBLEM' AND name='Angel Emblem'").get()).toMatchObject({
      base_stats: '{"STR":10,"DEX":10,"Max HP":400,"Attack Power":2,"Magic Attack":2}',
    });
    expect(database.prepare("SELECT base_stats FROM equipment_catalog_items WHERE slot='EMBLEM' AND name='Hybrid Heart'").get()).toMatchObject({
      base_stats: '{"Max HP":300,"Max MP":100,"Attack Power":2,"Magic Attack":2,"Defense":100}',
    });
  });

  it("stores Adele's exact level-100 secondary name and stats", () => {
    expect(database.prepare("SELECT name, level_requirement, base_stats FROM equipment_catalog_items WHERE maple_item_id=1354003").get()).toMatchObject({
      name: "Noble Bladebinder",
      level_requirement: 100,
      base_stats: '{"STR":10,"DEX":10,"Attack Power":3}',
    });
  });

  it("stores every standard class-specific level-100 secondary", () => {
    expect(database.prepare("SELECT COUNT(*) AS count FROM equipment_catalog_items WHERE slot='SECONDARY' AND variant_group='CLASS_STANDARD' AND level_requirement=100").get().count).toBe(47);
    expect(database.prepare("SELECT base_stats,star_force_profile FROM equipment_catalog_items WHERE name='Meteor Katara'").get()).toMatchObject({
      base_stats: '{"Max HP":370,"Attack Power":52}',
      star_force_profile: "WEAPON",
    });
    expect(database.prepare("SELECT base_stats FROM equipment_catalog_items WHERE name='Oort Compass'").get()).toMatchObject({
      base_stats: '{"INT":10,"LUK":10,"Magic Attack":3}',
    });
  });

  it("stores every class-specific Astra secondary with phase-one stats", () => {
    expect(database.prepare("SELECT COUNT(*) AS count FROM equipment_catalog_items WHERE slot='SECONDARY' AND variant_group='ASTRA'").get().count).toBe(52);
    expect(database.prepare("SELECT maple_item_id,base_stats FROM equipment_catalog_items WHERE name='Astra Compass'").get()).toMatchObject({
      maple_item_id: 1725300,
      base_stats: '{"INT":10,"LUK":10,"Magic Attack":7}',
    });
    expect(database.prepare("SELECT maple_item_id,base_stats FROM equipment_catalog_items WHERE name='Astra Katara'").get()).toMatchObject({
      maple_item_id: 1342121,
      base_stats: '{"STR":10,"DEX":10,"LUK":80,"Attack Power":225}',
    });
  });

  it("stores selectable Oz skill rings without enhancement profiles", () => {
    expect(database.prepare("SELECT COUNT(*) AS count FROM equipment_catalog_items WHERE slot='RING' AND variant_group='OZ_SKILL_RING'").get().count).toBe(20);
    expect(database.prepare("SELECT level_requirement,base_stats,star_force_profile FROM equipment_catalog_items WHERE name='Ring of Restraint'").get()).toMatchObject({
      level_requirement: 110,
      base_stats: '{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}',
      star_force_profile: "NONE",
    });
  });

  it("persists the selected Astra phase and applies its Star Force cap", async () => {
    const catalogItemId = database.prepare("SELECT id FROM equipment_catalog_items WHERE name='Astra Bladebinder'").get().id;
    const response = await app.request("/api/v1/equipment", {
      method: "POST",
      headers: {
        Cookie: "MAPLEHELPER_SESSION=session-1; MAPLEHELPER_CSRF=test",
        "X-XSRF-TOKEN": "test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slot: "SECONDARY", name: "Astra Bladebinder", catalogItemId, levelRequirement: 200, astraStage: 2, starForce: 20 }),
    }, env);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ name: "Astra Bladebinder", astraStage: 2, starForce: 20 });
  });

  it("canonicalizes Black Heart's fixed stars and potential when saving", async () => {
    const response = await app.request("/api/v1/equipment", {
      method: "POST",
      headers: {
        Cookie: "MAPLEHELPER_SESSION=session-1; MAPLEHELPER_CSRF=test",
        "X-XSRF-TOKEN": "test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slot: "HEART", name: "Black Heart", levelRequirement: 120, starForce: 0,
        potentialTier: "Legendary", potentialLines: "STR +12%",
      }),
    }, env);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      starForce: 15,
      potentialTier: "Epic",
      potentialLines: "Boss Damage +30%\nIgnore Enemy Defense +30%",
    });
  });

  it.each([
    ["Genesis Dual Bowguns", null, 22],
    ["Destiny Dual Bowguns", 1, 22],
    ["Destiny Dual Bowguns", 2, 25],
  ])("canonicalizes %s phase %s to its fixed Star Force", async (name, destinyStage, starForce) => {
    const response = await app.request("/api/v1/equipment", {
      method: "POST",
      headers: {
        Cookie: "MAPLEHELPER_SESSION=session-1; MAPLEHELPER_CSRF=test",
        "X-XSRF-TOKEN": "test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slot: "WEAPON", name, levelRequirement: name.startsWith("Genesis") ? 200 : 250, starForce: 0, destinyStage }),
    }, env);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ starForce, destinyStage });
  });
});
