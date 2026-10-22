PRAGMA foreign_keys = ON;

CREATE TABLE boss_tracker_entries (
  app_user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  character_profile_id INTEGER NOT NULL REFERENCES character_profiles(id) ON DELETE CASCADE,
  boss_key TEXT NOT NULL,
  boss_name TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  reset_period TEXT NOT NULL CHECK(reset_period IN ('WEEKLY', 'MONTHLY')),
  crystal_value INTEGER NOT NULL CHECK(crystal_value >= 0),
  party_size INTEGER NOT NULL DEFAULT 1 CHECK(party_size BETWEEN 1 AND 6),
  tracked INTEGER NOT NULL DEFAULT 0 CHECK(tracked IN (0, 1)),
  cleared INTEGER NOT NULL DEFAULT 0 CHECK(cleared IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (app_user_id, character_profile_id, boss_key)
);

CREATE INDEX boss_tracker_profile_idx
  ON boss_tracker_entries(app_user_id, character_profile_id, updated_at DESC);
