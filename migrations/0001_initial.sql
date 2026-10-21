PRAGMA foreign_keys = ON;

CREATE TABLE app_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_user_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,
  app_user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions(app_user_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE character_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  world TEXT NOT NULL,
  job TEXT NOT NULL,
  region TEXT NOT NULL CHECK(region IN ('NORTH_AMERICA', 'EUROPE')),
  weekly_rank INTEGER,
  weekly_experience INTEGER,
  image_url TEXT,
  source_url TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX character_profiles_user_name_region_uq
  ON character_profiles(app_user_id, name COLLATE NOCASE, region);
CREATE INDEX character_profiles_user_updated_idx
  ON character_profiles(app_user_id, updated_at DESC);

CREATE TABLE equipment_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  character_profile_id INTEGER REFERENCES character_profiles(id) ON DELETE CASCADE,
  slot TEXT NOT NULL,
  slot_index INTEGER,
  name TEXT NOT NULL,
  level_requirement INTEGER,
  star_force INTEGER,
  stat_lines TEXT,
  flame_stats TEXT,
  flame_score_lines TEXT,
  potential_tier TEXT,
  potential_lines TEXT,
  bonus_potential_tier TEXT,
  bonus_potential_lines TEXT,
  raw_extracted_text TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX equipment_items_user_updated_idx ON equipment_items(app_user_id, updated_at DESC);
CREATE INDEX equipment_items_profile_idx ON equipment_items(app_user_id, character_profile_id, updated_at DESC);
CREATE INDEX equipment_items_slot_idx ON equipment_items(slot, slot_index);

CREATE TABLE equipment_catalog_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot TEXT NOT NULL,
  name TEXT NOT NULL,
  level_requirement INTEGER,
  progression_stage TEXT,
  set_name TEXT,
  family_key TEXT,
  variant_group TEXT,
  job_group TEXT,
  name_pattern INTEGER NOT NULL DEFAULT 0,
  base_stats TEXT,
  star_force_profile TEXT NOT NULL DEFAULT 'ARMOR_ACCESSORY',
  notes TEXT,
  UNIQUE(slot, name)
);
CREATE INDEX equipment_catalog_slot_idx ON equipment_catalog_items(slot, level_requirement, name);

INSERT INTO equipment_catalog_items
  (slot, name, level_requirement, progression_stage, set_name, name_pattern, star_force_profile, notes)
VALUES
  ('RING', 'Silver Blossom Ring', 110, 'early', 'Boss Accessory', 0, 'ARMOR_ACCESSORY', NULL),
  ('RING', 'Superior Gollux Ring', 150, 'late', 'Gollux', 0, 'SUPERIOR', NULL),
  ('RING', 'Guardian Angel Ring', 160, 'late', 'Dawn Boss', 0, 'ARMOR_ACCESSORY', NULL),
  ('PENDANT', 'Dominator Pendant', 140, 'mid', 'Boss Accessory', 0, 'ARMOR_ACCESSORY', NULL),
  ('PENDANT', 'Superior Gollux Pendant', 150, 'late', 'Gollux', 0, 'SUPERIOR', NULL),
  ('WEAPON', 'Fafnir', 150, 'mid', 'Root Abyss', 1, 'WEAPON', 'Exact item depends on class.'),
  ('WEAPON', 'Absolab', 160, 'mid', 'Absolab', 1, 'WEAPON', 'Exact item depends on class.'),
  ('WEAPON', 'Arcane Umbra', 200, 'late', 'Arcane Umbra', 1, 'WEAPON', 'Exact item depends on class.'),
  ('WEAPON', 'Genesis', 200, 'endgame', 'Genesis', 1, 'WEAPON', 'Exact item depends on class.'),
  ('HAT', 'Chaos Root Abyss', 150, 'mid', 'Root Abyss', 1, 'ARMOR_ACCESSORY', 'Exact item depends on class.'),
  ('TOP', 'Chaos Root Abyss', 150, 'mid', 'Root Abyss', 1, 'ARMOR_ACCESSORY', 'Exact item depends on class.'),
  ('BOTTOM', 'Chaos Root Abyss', 150, 'mid', 'Root Abyss', 1, 'ARMOR_ACCESSORY', 'Exact item depends on class.'),
  ('GLOVES', 'Absolab', 160, 'mid', 'Absolab', 1, 'ARMOR_ACCESSORY', 'Exact item depends on class.'),
  ('SHOES', 'Absolab', 160, 'mid', 'Absolab', 1, 'ARMOR_ACCESSORY', 'Exact item depends on class.'),
  ('CAPE', 'Absolab', 160, 'mid', 'Absolab', 1, 'ARMOR_ACCESSORY', 'Exact item depends on class.'),
  ('SHOULDER', 'Absolab', 160, 'mid', 'Absolab', 1, 'ARMOR_ACCESSORY', 'Exact item depends on class.'),
  ('POCKET', 'Pink Holy Cup', 140, 'early', 'Boss Accessory', 0, 'NONE', NULL),
  ('BADGE', 'Crystal Ventus Badge', 130, 'early', 'Boss Accessory', 0, 'NONE', NULL),
  ('HEART', 'Fairy Heart', 100, 'late', NULL, 0, 'NONE', NULL);
