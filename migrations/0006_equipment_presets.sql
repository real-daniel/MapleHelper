ALTER TABLE equipment_items
  ADD COLUMN preset_number INTEGER NOT NULL DEFAULT 1 CHECK (preset_number BETWEEN 1 AND 3);

CREATE INDEX equipment_items_profile_preset_idx
  ON equipment_items(app_user_id, character_profile_id, preset_number, updated_at DESC);
