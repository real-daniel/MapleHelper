import { Hono } from "hono";
import { currentUser, beginDiscordLogin, finishDiscordLogin, issueCsrf, logout, requireAuth, requireCsrf } from "./auth";
import { camelRow, errorResponse, HttpError, integerValue, asObject, stringValue } from "./http";
import { importCharacter, parseRegion } from "./nexon";
import type { AppBindings, EquipmentSlot } from "./types";
import { EQUIPMENT_SLOTS } from "./types";
import { extractEquipment, extractStatEquivalencies } from "./vision";
import { equipmentSlotCapacity, resolveEquipmentSlotIndex } from "./equipment/slots";

const app = new Hono<AppBindings>();

app.onError((error, c) => errorResponse(c, error));
app.get("/health", (c) => c.json({ status: "UP" }));
app.get("/oauth2/authorization/discord", beginDiscordLogin);
app.get("/login/oauth2/code/discord", finishDiscordLogin);
app.get("/api/v1/auth/csrf", issueCsrf);

app.use("/api/v1/auth/me", requireAuth);
app.get("/api/v1/auth/me", (c) => c.json(currentUser(c)));
app.use("/api/v1/auth/logout", requireAuth, requireCsrf);
app.post("/api/v1/auth/logout", logout);

app.use("/api/v1/characters/*", requireAuth);
app.get("/api/v1/characters/import", async (c) => {
  return c.json(await importCharacter(c.env.NEXON_BASE_URL, c.req.query("name"), c.req.query("region")));
});

app.use("/api/v1/profiles", requireAuth, requireCsrf);
app.use("/api/v1/profiles/*", requireAuth, requireCsrf);

app.get("/api/v1/profiles", async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT id, name, world, job, region, weekly_rank, weekly_experience, image_url, source_url,
      retrieved_at, created_at, updated_at
    FROM character_profiles WHERE app_user_id = ? ORDER BY updated_at DESC
  `).bind(currentUser(c).id).all<Record<string, unknown>>();
  return c.json(rows.results.map(camelRow));
});

app.post("/api/v1/profiles/import", async (c) => {
  const body = asObject(await c.req.json());
  const name = stringValue(body.name, "name", 20, true)!;
  if (!/^[A-Za-z0-9]+$/.test(name)) throw new HttpError(400, "name must contain only letters and numbers.");
  const region = parseRegion(typeof body.region === "string" ? body.region : undefined);
  const imported = await importCharacter(c.env.NEXON_BASE_URL, name, region);
  const userId = currentUser(c).id;
  const existing = await c.env.DB.prepare("SELECT id, created_at FROM character_profiles WHERE app_user_id = ? AND name = ? COLLATE NOCASE AND region = ?")
    .bind(userId, imported.name, imported.region).first<{ id: number; created_at: string }>();
  const now = new Date().toISOString();
  let id: number;
  if (existing) {
    id = existing.id;
    await c.env.DB.prepare(`UPDATE character_profiles SET name=?, world=?, job=?, weekly_rank=?, weekly_experience=?,
      image_url=?, source_url=?, retrieved_at=?, updated_at=? WHERE id=? AND app_user_id=?`)
      .bind(imported.name, imported.world, imported.job, imported.weeklyRank, imported.weeklyExperience,
        imported.imageUrl, imported.sourceUrl, imported.retrievedAt, now, id, userId).run();
  } else {
    const result = await c.env.DB.prepare(`INSERT INTO character_profiles
      (app_user_id,name,world,job,region,weekly_rank,weekly_experience,image_url,source_url,retrieved_at,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(userId, imported.name, imported.world, imported.job, imported.region, imported.weeklyRank,
        imported.weeklyExperience, imported.imageUrl, imported.sourceUrl, imported.retrievedAt, now, now).run();
    id = Number(result.meta.last_row_id);
  }
  return c.json(await profileById(c.env.DB, id, userId), 201);
});

app.get("/api/v1/profiles/:id", async (c) => c.json(await profileById(c.env.DB, pathId(c.req.param("id")), currentUser(c).id)));

app.put("/api/v1/profiles/:id", async (c) => {
  const id = pathId(c.req.param("id"));
  const userId = currentUser(c).id;
  await profileById(c.env.DB, id, userId);
  const body = asObject(await c.req.json());
  const world = stringValue(body.world, "world", 40, true)!;
  const job = stringValue(body.job, "job", 80, true)!;
  await c.env.DB.prepare("UPDATE character_profiles SET world=?, job=?, updated_at=? WHERE id=? AND app_user_id=?")
    .bind(world, job, new Date().toISOString(), id, userId).run();
  return c.json(await profileById(c.env.DB, id, userId));
});

app.delete("/api/v1/profiles/:id", async (c) => {
  const result = await c.env.DB.prepare("DELETE FROM character_profiles WHERE id=? AND app_user_id=?")
    .bind(pathId(c.req.param("id")), currentUser(c).id).run();
  if (!result.meta.changes) throw new HttpError(404, "Character profile was not found.");
  return c.body(null, 204);
});

app.use("/api/v1/equipment", requireAuth, requireCsrf);
app.use("/api/v1/equipment/*", requireAuth, requireCsrf);

app.get("/api/v1/equipment", async (c) => {
  const userId = currentUser(c).id;
  const profileParam = c.req.query("characterProfileId");
  const profileId = profileParam ? pathId(profileParam) : null;
  if (profileId != null) await profileById(c.env.DB, profileId, userId);
  const statement = profileId == null
    ? c.env.DB.prepare("SELECT * FROM equipment_items WHERE app_user_id=? ORDER BY updated_at DESC").bind(userId)
    : c.env.DB.prepare("SELECT * FROM equipment_items WHERE app_user_id=? AND character_profile_id=? ORDER BY updated_at DESC").bind(userId, profileId);
  const rows = await statement.all<Record<string, unknown>>();
  return c.json(rows.results.map(publicEquipment));
});

app.get("/api/v1/equipment/catalog", async (c) => {
  const slot = c.req.query("slot");
  if (slot && !EQUIPMENT_SLOTS.includes(slot as EquipmentSlot)) throw new HttpError(400, "Invalid equipment slot.");
  const statement = slot
    ? c.env.DB.prepare("SELECT * FROM equipment_catalog_items WHERE slot=? ORDER BY level_requirement, name").bind(slot)
    : c.env.DB.prepare("SELECT * FROM equipment_catalog_items ORDER BY slot, level_requirement, name");
  const rows = await statement.all<Record<string, unknown>>();
  return c.json(rows.results.map((row) => ({ ...camelRow(row), namePattern: Boolean(row.name_pattern) })));
});

app.post("/api/v1/equipment/extract", async (c) => c.json(await extractEquipment(c.env, await c.req.formData())));
app.post("/api/v1/character-stat-equivalencies/extract", requireAuth, requireCsrf,
  async (c) => c.json(await extractStatEquivalencies(c.env, await c.req.formData())));

app.post("/api/v1/equipment", async (c) => {
  const body = asObject(await c.req.json());
  const userId = currentUser(c).id;
  const profileId = integerValue(body.characterProfileId, "characterProfileId", 1, Number.MAX_SAFE_INTEGER);
  if (profileId != null) await profileById(c.env.DB, profileId, userId);
  const slot = body.slot;
  if (typeof slot !== "string" || !EQUIPMENT_SLOTS.includes(slot as EquipmentSlot)) throw new HttpError(400, "Invalid equipment slot.");
  const capacity = equipmentSlotCapacity(slot as EquipmentSlot);
  const requestedSlotIndex = capacity === 1 ? null : integerValue(body.slotIndex, "slotIndex", 1, capacity);
  let slotIndex = resolveEquipmentSlotIndex(slot as EquipmentSlot, requestedSlotIndex, []);
  if (profileId != null && capacity > 1) {
    const occupied = await c.env.DB.prepare("SELECT slot_index FROM equipment_items WHERE app_user_id=? AND character_profile_id=? AND slot=?")
      .bind(userId, profileId, slot).all<{ slot_index: number | null }>();
    slotIndex = resolveEquipmentSlotIndex(slot as EquipmentSlot, requestedSlotIndex, occupied.results.map((row) => row.slot_index));
  }
  if (profileId != null) {
    await c.env.DB.prepare("DELETE FROM equipment_items WHERE app_user_id=? AND character_profile_id=? AND slot=? AND slot_index IS ?")
      .bind(userId, profileId, slot, slotIndex).run();
  }
  const now = new Date().toISOString();
  const values = {
    name: stringValue(body.name, "name", 120, true)!,
    level: integerValue(body.levelRequirement, "levelRequirement", 0, 300),
    stars: integerValue(body.starForce, "starForce", 0, 25),
    stat: stringValue(body.statLines, "statLines", 4000),
    flame: stringValue(body.flameStats, "flameStats", 4000),
    flameScore: stringValue(body.flameScoreLines, "flameScoreLines", 4000),
    potentialTier: stringValue(body.potentialTier, "potentialTier", 30),
    potential: stringValue(body.potentialLines, "potentialLines", 4000),
    bonusTier: stringValue(body.bonusPotentialTier, "bonusPotentialTier", 30),
    bonus: stringValue(body.bonusPotentialLines, "bonusPotentialLines", 4000),
    raw: stringValue(body.rawExtractedText, "rawExtractedText", 8000),
  };
  const result = await c.env.DB.prepare(`INSERT INTO equipment_items
    (app_user_id,character_profile_id,slot,slot_index,name,level_requirement,star_force,stat_lines,flame_stats,
     flame_score_lines,potential_tier,potential_lines,bonus_potential_tier,bonus_potential_lines,raw_extracted_text,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(userId, profileId, slot, slotIndex, values.name, values.level, values.stars, values.stat, values.flame,
      values.flameScore, values.potentialTier, values.potential, values.bonusTier, values.bonus, values.raw, now, now).run();
  const row = await c.env.DB.prepare("SELECT * FROM equipment_items WHERE id=? AND app_user_id=?")
    .bind(result.meta.last_row_id, userId).first<Record<string, unknown>>();
  return c.json(publicEquipment(row!), 201);
});

app.delete("/api/v1/equipment/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM equipment_items WHERE id=? AND app_user_id=?")
    .bind(pathId(c.req.param("id")), currentUser(c).id).run();
  return c.body(null, 204);
});

app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

function pathId(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, "Invalid id.");
  return id;
}

async function profileById(db: D1Database, id: number, userId: number) {
  const row = await db.prepare(`SELECT id,name,world,job,region,weekly_rank,weekly_experience,image_url,source_url,
    retrieved_at,created_at,updated_at FROM character_profiles WHERE id=? AND app_user_id=?`)
    .bind(id, userId).first<Record<string, unknown>>();
  if (!row) throw new HttpError(404, "Character profile was not found.");
  return camelRow(row);
}

function publicEquipment(row: Record<string, unknown>) {
  const { app_user_id: _private, ...visible } = row;
  return camelRow(visible);
}

export default app;
