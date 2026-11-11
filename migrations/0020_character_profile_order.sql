ALTER TABLE character_profiles ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE character_profiles
SET sort_order = (
  SELECT COUNT(*) - 1
  FROM character_profiles AS earlier
  WHERE earlier.app_user_id = character_profiles.app_user_id
    AND (
      earlier.updated_at > character_profiles.updated_at
      OR (earlier.updated_at = character_profiles.updated_at AND earlier.id <= character_profiles.id)
    )
);

CREATE INDEX character_profiles_user_sort_idx
  ON character_profiles(app_user_id, sort_order, id);
