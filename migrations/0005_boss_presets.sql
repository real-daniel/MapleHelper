CREATE TABLE boss_tracker_presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL COLLATE NOCASE,
  entries_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(app_user_id, name)
);
