import { Hono } from "hono";
import { currentUser, beginDiscordLogin, finishDiscordLogin, issueCsrf, logout, requireAuth, requireCsrf } from "./auth";
import { camelRow, errorResponse, HttpError, integerValue, asObject, stringValue } from "./http";
import { importCharacter, parseRegion } from "./nexon";
import type { AppBindings, EquipmentSlot } from "./types";
import { EQUIPMENT_SLOTS } from "./types";
import { extractEquipment, extractStatEquivalencies } from "./vision";
import { equipmentSlotCapacity, resolveEquipmentSlotIndex } from "./equipment/slots";
import { parseBossEntry, parsePresetEntries } from "./boss-tracker";
import { accountBossIncome, type BossPlanEntry } from "../../shared/boss-income";

const app = new Hono<AppBindings>();

app.onError((error, c) => errorResponse(c, error));
app.get("/health", (c) => c.json({ status: "UP" }));
app.get("/oauth2/authorization/discord", beginDiscordLogin);
app.get("/login/oauth2/code/discord", finishDiscordLogin);
app.get("/api/v1/auth/csrf", issueCsrf);

app.get("/api/v1/equipment-icons", async (c) => {
  const name = c.req.query("name")?.trim();
  if (!name || name.length > 120) throw new HttpError(400, "A valid equipment name is required.");
  const levelValue = Number(c.req.query("level"));
  const level = Number.isInteger(levelValue) && levelValue >= 0 && levelValue <= 300 ? levelValue : null;
  const slotValue = c.req.query("slot")?.toUpperCase();
  const slot = slotValue && EQUIPMENT_SLOTS.includes(slotValue as EquipmentSlot) ? slotValue as EquipmentSlot : null;
  const cache = (caches as CacheStorage & { default: Cache }).default;
  const cacheKey = new Request(c.req.url, { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const icon = await fetchEquipmentIcon(name, level, slot);
  if (!icon) return c.body(null, 404);
  const response = new Response(icon.body, {
    headers: {
      "Content-Type": icon.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "public, max-age=604800, s-maxage=2592000",
    },
  });
  c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
});

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

app.use("/api/v1/boss-tracker", requireAuth, requireCsrf);
app.use("/api/v1/boss-tracker/*", requireAuth, requireCsrf);

app.get("/api/v1/boss-tracker/account", async (c) => {
  const rows = await c.env.DB.prepare(`SELECT character_profile_id,boss_key,boss_name,difficulty,reset_period,
    crystal_value,party_size,tracked,cleared FROM boss_tracker_entries WHERE app_user_id=? ORDER BY character_profile_id,boss_key`)
    .bind(currentUser(c).id).all<Record<string, unknown>>();
  const entries = rows.results.map(publicBossEntry) as (BossPlanEntry & { characterProfileId: number })[];
  return c.json(accountBossIncome(entries));
});

app.get("/api/v1/boss-tracker/presets", async (c) => {
  const rows = await c.env.DB.prepare("SELECT id,name FROM boss_tracker_presets WHERE app_user_id=? ORDER BY name")
    .bind(currentUser(c).id).all<{ id: number; name: string }>();
  return c.json(rows.results);
});

app.post("/api/v1/boss-tracker/presets", async (c) => {
  const body = asObject(await c.req.json());
  const userId = currentUser(c).id;
  const profileId = integerValue(body.characterProfileId, "characterProfileId", 1, Number.MAX_SAFE_INTEGER);
  if (profileId == null) throw new HttpError(400, "characterProfileId is required.");
  await profileById(c.env.DB, profileId, userId);
  const name = stringValue(body.name, "name", 80, true)!;
  const entries = parsePresetEntries(body.entries);
  const result = await c.env.DB.prepare(`INSERT INTO boss_tracker_presets (app_user_id,name,entries_json,created_at)
    VALUES (?,?,?,?) ON CONFLICT(app_user_id,name) DO NOTHING`)
    .bind(userId, name, JSON.stringify(entries), new Date().toISOString()).run();
  if (!result.meta.changes) throw new HttpError(409, "A preset with that name already exists. Choose another name.");
  return c.json({ id: Number(result.meta.last_row_id), name }, 201);
});

app.put("/api/v1/boss-tracker/presets/:id", async (c) => {
  const userId = currentUser(c).id;
  const id = pathId(c.req.param("id"));
  const preset = await c.env.DB.prepare("SELECT id FROM boss_tracker_presets WHERE id=? AND app_user_id=?")
    .bind(id, userId).first<{ id: number }>();
  if (!preset) throw new HttpError(404, "Boss preset was not found.");
  const body = asObject(await c.req.json());
  const name = stringValue(body.name, "name", 80, true)!;
  const entries = body.entries === undefined ? null : JSON.stringify(parsePresetEntries(body.entries));
  const result = await c.env.DB.prepare(`UPDATE OR IGNORE boss_tracker_presets
    SET name=?,entries_json=COALESCE(?,entries_json) WHERE id=? AND app_user_id=?`)
    .bind(name, entries, id, userId).run();
  if (!result.meta.changes) throw new HttpError(409, "A preset with that name already exists. Choose another name.");
  return c.json({ id, name });
});

app.delete("/api/v1/boss-tracker/presets/:id", async (c) => {
  const result = await c.env.DB.prepare("DELETE FROM boss_tracker_presets WHERE id=? AND app_user_id=?")
    .bind(pathId(c.req.param("id")), currentUser(c).id).run();
  if (!result.meta.changes) throw new HttpError(404, "Boss preset was not found.");
  return c.body(null, 204);
});

app.post("/api/v1/boss-tracker/presets/:id/apply", async (c) => {
  const body = asObject(await c.req.json());
  const userId = currentUser(c).id;
  const profileId = integerValue(body.characterProfileId, "characterProfileId", 1, Number.MAX_SAFE_INTEGER);
  if (profileId == null) throw new HttpError(400, "characterProfileId is required.");
  await profileById(c.env.DB, profileId, userId);
  const preset = await c.env.DB.prepare("SELECT entries_json FROM boss_tracker_presets WHERE id=? AND app_user_id=?")
    .bind(pathId(c.req.param("id")), userId).first<{ entries_json: string }>();
  if (!preset) throw new HttpError(404, "Boss preset was not found.");
  const entries = parsePresetEntries(JSON.parse(preset.entries_json));
  const now = new Date().toISOString();
  // Keep clears for bosses still selected; remove excluded bosses from the plan atomically.
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE boss_tracker_entries SET tracked=0,cleared=0,updated_at=?
      WHERE app_user_id=? AND character_profile_id=?
      AND boss_key NOT IN (SELECT json_extract(value,'$.bossKey') FROM json_each(?))`)
      .bind(now, userId, profileId, preset.entries_json),
    ...entries.map((entry) => c.env.DB.prepare(`INSERT INTO boss_tracker_entries
      (app_user_id,character_profile_id,boss_key,boss_name,difficulty,reset_period,crystal_value,party_size,tracked,cleared,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,1,0,?,?) ON CONFLICT(app_user_id,character_profile_id,boss_key) DO UPDATE SET
      boss_name=excluded.boss_name,difficulty=excluded.difficulty,reset_period=excluded.reset_period,
      crystal_value=excluded.crystal_value,party_size=excluded.party_size,tracked=1,updated_at=excluded.updated_at`)
      .bind(userId, profileId, entry.bossKey, entry.bossName, entry.difficulty, entry.resetPeriod,
        entry.crystalValue, entry.partySize, now, now)),
  ]);
  const rows = await c.env.DB.prepare(`SELECT boss_key,boss_name,difficulty,reset_period,crystal_value,
    party_size,tracked,cleared FROM boss_tracker_entries WHERE app_user_id=? AND character_profile_id=? ORDER BY boss_name`)
    .bind(userId, profileId).all<Record<string, unknown>>();
  return c.json(rows.results.map(publicBossEntry));
});

app.get("/api/v1/boss-tracker", async (c) => {
  const userId = currentUser(c).id;
  const profileId = pathId(c.req.query("characterProfileId") ?? "");
  await profileById(c.env.DB, profileId, userId);
  const rows = await c.env.DB.prepare(`SELECT boss_key,boss_name,difficulty,reset_period,crystal_value,
    party_size,tracked,cleared,updated_at FROM boss_tracker_entries
    WHERE app_user_id=? AND character_profile_id=? ORDER BY boss_name`)
    .bind(userId, profileId).all<Record<string, unknown>>();
  return c.json(rows.results.map(publicBossEntry));
});

app.put("/api/v1/boss-tracker", async (c) => {
  const body = asObject(await c.req.json());
  const userId = currentUser(c).id;
  const profileId = integerValue(body.characterProfileId, "characterProfileId", 1, Number.MAX_SAFE_INTEGER);
  if (profileId == null) throw new HttpError(400, "characterProfileId is required.");
  await profileById(c.env.DB, profileId, userId);
  const { bossKey, bossName, difficulty, resetPeriod, crystalValue, partySize, tracked, cleared } = parseBossEntry(body);
  const now = new Date().toISOString();
  await c.env.DB.prepare(`INSERT INTO boss_tracker_entries
    (app_user_id,character_profile_id,boss_key,boss_name,difficulty,reset_period,crystal_value,party_size,tracked,cleared,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(app_user_id,character_profile_id,boss_key) DO UPDATE SET
      boss_name=excluded.boss_name,difficulty=excluded.difficulty,reset_period=excluded.reset_period,
      crystal_value=excluded.crystal_value,party_size=excluded.party_size,tracked=excluded.tracked,
      cleared=excluded.cleared,updated_at=excluded.updated_at`)
    .bind(userId, profileId, bossKey, bossName, difficulty, resetPeriod, crystalValue, partySize,
      tracked ? 1 : 0, cleared ? 1 : 0, now, now).run();
  const saved = await c.env.DB.prepare(`SELECT boss_key,boss_name,difficulty,reset_period,crystal_value,
    party_size,tracked,cleared,updated_at FROM boss_tracker_entries
    WHERE app_user_id=? AND character_profile_id=? AND boss_key=?`)
    .bind(userId, profileId, bossKey).first<Record<string, unknown>>();
  return c.json(publicBossEntry(saved!));
});

app.post("/api/v1/boss-tracker/reset", async (c) => {
  const body = asObject(await c.req.json());
  const userId = currentUser(c).id;
  const profileId = integerValue(body.characterProfileId, "characterProfileId", 1, Number.MAX_SAFE_INTEGER);
  if (profileId == null) throw new HttpError(400, "characterProfileId is required.");
  await profileById(c.env.DB, profileId, userId);
  await c.env.DB.prepare("UPDATE boss_tracker_entries SET cleared=0,updated_at=? WHERE app_user_id=? AND character_profile_id=?")
    .bind(new Date().toISOString(), userId, profileId).run();
  return c.json({ reset: true });
});

app.post("/api/v1/boss-tracker/clear-all", async (c) => {
  const body = asObject(await c.req.json());
  const userId = currentUser(c).id;
  const profileId = integerValue(body.characterProfileId, "characterProfileId", 1, Number.MAX_SAFE_INTEGER);
  if (profileId == null) throw new HttpError(400, "characterProfileId is required.");
  await profileById(c.env.DB, profileId, userId);
  await c.env.DB.prepare(`UPDATE boss_tracker_entries SET cleared=1,updated_at=?
    WHERE app_user_id=? AND character_profile_id=? AND tracked=1`)
    .bind(new Date().toISOString(), userId, profileId).run();
  return c.json({ cleared: true });
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
  const jobGroupValue = c.req.query("jobGroup");
  const equipmentJobGroups = ["Warrior", "Magician", "Bowman", "Thief", "Pirate"];
  const jobGroups = jobGroupValue?.split(",").filter(Boolean) ?? [];
  if (jobGroups.some((jobGroup) => !equipmentJobGroups.includes(jobGroup))) throw new HttpError(400, "Invalid equipment job group.");
  const slotIndex = Number(c.req.query("slotIndex"));
  const indexedSlot = slot === "RING" && Number.isInteger(slotIndex) && slotIndex >= 1 && slotIndex <= 4
    ? `RING_${slotIndex}`
    : slot === "PENDANT" && Number.isInteger(slotIndex) && slotIndex >= 1 && slotIndex <= 2
      ? `PENDANT_${slotIndex}`
      : null;
  const conditions: string[] = [];
  const bindings: string[] = [];
  if (slot && indexedSlot) {
    conditions.push("slot IN (?,?)");
    bindings.push(slot, indexedSlot);
  } else if (slot) {
    conditions.push("slot=?");
    bindings.push(slot);
  }
  if (jobGroups.length) {
    conditions.push(`(job_group IS NULL OR job_group IN (${jobGroups.map(() => "?").join(",")}))`);
    bindings.push(...jobGroups);
  }
  const order = slot ? "level_requirement, name" : "slot, level_requirement, name";
  const sql = `SELECT * FROM equipment_catalog_items${conditions.length ? ` WHERE ${conditions.join(" AND ")}` : ""} ORDER BY ${order}`;
  const statement = c.env.DB.prepare(sql).bind(...bindings);
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
  const profile = profileId != null ? await profileById(c.env.DB, profileId, userId) : null;
  const slot = body.slot;
  if (typeof slot !== "string" || !EQUIPMENT_SLOTS.includes(slot as EquipmentSlot)) throw new HttpError(400, "Invalid equipment slot.");
  const catalogItemId = integerValue(body.catalogItemId, "catalogItemId", 1, Number.MAX_SAFE_INTEGER);
  if (catalogItemId != null) {
    const catalogItem = await c.env.DB.prepare("SELECT slot FROM equipment_catalog_items WHERE id=?")
      .bind(catalogItemId).first<{ slot: string }>();
    if (!catalogItem || catalogItem.slot.replace(/_(?:1|2|3|4)$/, "") !== slot) {
      throw new HttpError(400, "catalogItemId does not match the selected equipment slot.");
    }
  }
  const presetNumber = integerValue(body.presetNumber, "presetNumber", 1, 3) ?? 1;
  const capacity = equipmentSlotCapacity(slot as EquipmentSlot);
  const requestedSlotIndex = capacity === 1 ? null : integerValue(body.slotIndex, "slotIndex", 1, capacity);
  let slotIndex = resolveEquipmentSlotIndex(slot as EquipmentSlot, requestedSlotIndex, []);
  if (profileId != null && capacity > 1) {
    const occupied = await c.env.DB.prepare("SELECT slot_index FROM equipment_items WHERE app_user_id=? AND character_profile_id=? AND preset_number=? AND slot=?")
      .bind(userId, profileId, presetNumber, slot).all<{ slot_index: number | null }>();
    slotIndex = resolveEquipmentSlotIndex(slot as EquipmentSlot, requestedSlotIndex, occupied.results.map((row) => row.slot_index));
  }
  if (profileId != null) {
    await c.env.DB.prepare("DELETE FROM equipment_items WHERE app_user_id=? AND character_profile_id=? AND preset_number=? AND slot=? AND slot_index IS ?")
      .bind(userId, profileId, presetNumber, slot, slotIndex).run();
  }
  const now = new Date().toISOString();
  const values = {
    name: stringValue(body.name, "name", 120, true)!,
    level: integerValue(body.levelRequirement, "levelRequirement", 0, 300),
    stars: integerValue(body.starForce, "starForce", 0, 30),
    astraStage: integerValue(body.astraStage, "astraStage", 1, 3),
    stat: stringValue(body.statLines, "statLines", 4000),
    flame: stringValue(body.flameStats, "flameStats", 4000),
    flameScore: stringValue(body.flameScoreLines, "flameScoreLines", 4000),
    potentialTier: stringValue(body.potentialTier, "potentialTier", 30),
    potential: stringValue(body.potentialLines, "potentialLines", 4000),
    bonusTier: stringValue(body.bonusPotentialTier, "bonusPotentialTier", 30),
    bonus: stringValue(body.bonusPotentialLines, "bonusPotentialLines", 4000),
    raw: stringValue(body.rawExtractedText, "rawExtractedText", 8000),
  };
  const astra = slot === "SECONDARY" && /^astra\b/i.test(values.name);
  const astraAlwaysThirty = /astra (katara|talisman)/i.test(values.name) || /dual blade|kanna/i.test(String(profile?.job ?? ""));
  const astraCap = astraAlwaysThirty ? 30 : values.astraStage === 3 ? 30 : values.astraStage === 2 ? 20 : 15;
  const badgeCap = slot === "BADGE" && ["ghost ship exorcist", "sengoku hakase badge", "shackles of resentment"].includes(values.name.toLowerCase())
    ? 22
    : standardStarForceLimit(values.level);
  const starForceCap = astra ? astraCap : badgeCap;
  if (values.stars != null && values.stars > starForceCap) {
    throw new HttpError(400, `starForce cannot exceed ${starForceCap} for this equipment.`);
  }
  const result = await c.env.DB.prepare(`INSERT INTO equipment_items
    (app_user_id,character_profile_id,catalog_item_id,preset_number,slot,slot_index,name,level_requirement,star_force,astra_stage,stat_lines,flame_stats,
     flame_score_lines,potential_tier,potential_lines,bonus_potential_tier,bonus_potential_lines,raw_extracted_text,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(userId, profileId, catalogItemId, presetNumber, slot, slotIndex, values.name, values.level, values.stars, astra ? values.astraStage ?? 1 : null, values.stat, values.flame,
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

function standardStarForceLimit(level: number | null) {
  if (level == null || level >= 138) return 30;
  if (level >= 128) return 20;
  if (level >= 118) return 15;
  if (level >= 108) return 10;
  if (level >= 95) return 8;
  return 5;
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

function publicBossEntry(row: Record<string, unknown>) {
  return {
    ...camelRow(row),
    tracked: Boolean(row.tracked),
    cleared: Boolean(row.cleared),
  };
}

type MapleStoryIoItem = {
  id: number;
  name: string;
  requiredLevel?: number | null;
  typeInfo?: { overallCategory?: string; category?: string; subCategory?: string };
};

let gmsVersionPromise: Promise<string> | null = null;

async function fetchEquipmentIcon(name: string, level: number | null, slot: EquipmentSlot | null) {
  try {
    const version = await currentGmsVersion();
    const searchName = equipmentIconSearchName(name, slot);
    const search = new URL(`https://maplestory.io/api/GMS/${version}/item`);
    search.search = new URLSearchParams({ searchFor: searchName, count: "50" }).toString();
    const searchResponse = await fetch(search, { headers: { Accept: "application/json" } });
    if (!searchResponse.ok) return null;
    const items = await searchResponse.json<MapleStoryIoItem[]>();
    const match = items
      .filter((item) => item.typeInfo?.overallCategory === "Equip")
      .map((item) => ({ item, score: equipmentIconScore(item, searchName, level, slot) }))
      .sort((left, right) => right.score - left.score)[0];
    if (!match || match.score < 20) return null;
    const iconResponse = await fetch(`https://maplestory.io/api/GMS/${version}/item/${match.item.id}/icon`);
    return iconResponse.ok ? iconResponse : null;
  } catch (error) {
    console.error("Equipment icon lookup failed", error);
    return null;
  }
}

function equipmentIconSearchName(name: string, slot: EquipmentSlot | null) {
  if (["chaos root abyss", "root abyss"].includes(name.toLowerCase())) {
    if (slot === "HAT") return "Royal Warrior Helm";
    if (slot === "TOP") return "Eagle Eye Warrior Armor";
    if (slot === "BOTTOM") return "Trixter Warrior Pants";
  }
  return name;
}

async function currentGmsVersion() {
  if (!gmsVersionPromise) {
    gmsVersionPromise = fetch("https://maplestory.io/api/wz")
      .then((response) => {
        if (!response.ok) throw new Error(`MapleStory.IO version lookup failed (${response.status}).`);
        return response.json<Array<{ region: string; mapleVersionId: string; isReady: boolean; hasImages: boolean }>>();
      })
      .then((versions) => versions
        .filter((version) => version.region === "GMS" && version.isReady && version.hasImages && /^\d+$/.test(version.mapleVersionId))
        .sort((left, right) => Number(right.mapleVersionId) - Number(left.mapleVersionId))[0]?.mapleVersionId ?? "270")
      .catch((error) => {
        gmsVersionPromise = null;
        throw error;
      });
  }
  return gmsVersionPromise;
}

function equipmentIconScore(item: MapleStoryIoItem, name: string, level: number | null, slot: EquipmentSlot | null) {
  const candidate = item.name.toLowerCase();
  const requested = name.toLowerCase();
  let score = candidate === requested ? 100 : candidate.startsWith(requested) ? 65 : candidate.includes(requested) ? 40 : 0;
  if (level != null && item.requiredLevel === level) score += 30;
  const category = `${item.typeInfo?.category ?? ""} ${item.typeInfo?.subCategory ?? ""}`.toLowerCase();
  if (slot && slotIconHints(slot).some((hint) => category.includes(hint))) score += 35;
  return score;
}

function slotIconHints(slot: EquipmentSlot): string[] {
  const hints: Partial<Record<EquipmentSlot, string[]>> = {
    RING: ["ring"], PENDANT: ["pendant"], WEAPON: ["weapon"], SECONDARY: ["secondary", "shield"],
    EMBLEM: ["emblem"], HAT: ["hat", "cap"], FACE: ["face"], EYE: ["eye"], EARRINGS: ["earring"],
    TOP: ["coat", "top"], BOTTOM: ["pants", "bottom"], SHOES: ["shoe"], GLOVES: ["glove"],
    CAPE: ["cape"], BELT: ["belt"], SHOULDER: ["shoulder"], POCKET: ["pocket"], BADGE: ["badge"],
    MEDAL: ["medal"], ANDROID: ["android"], HEART: ["heart"], TOTEM: ["totem"],
  };
  return hints[slot] ?? [];
}

export default app;
