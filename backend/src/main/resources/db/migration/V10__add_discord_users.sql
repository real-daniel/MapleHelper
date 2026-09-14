CREATE TABLE app_users (
    id BIGSERIAL PRIMARY KEY,
    discord_user_id VARCHAR(32) NOT NULL UNIQUE,
    username VARCHAR(64) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE character_profiles
    ADD COLUMN app_user_id BIGINT REFERENCES app_users(id) ON DELETE CASCADE;

ALTER TABLE equipment_items
    ADD COLUMN app_user_id BIGINT REFERENCES app_users(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS character_profiles_name_region_uq;

CREATE UNIQUE INDEX character_profiles_user_name_region_uq
    ON character_profiles (app_user_id, LOWER(name), region)
    WHERE app_user_id IS NOT NULL;

CREATE UNIQUE INDEX character_profiles_legacy_name_region_uq
    ON character_profiles (LOWER(name), region)
    WHERE app_user_id IS NULL;

CREATE INDEX character_profiles_app_user_id_idx
    ON character_profiles (app_user_id, updated_at DESC);

CREATE INDEX equipment_items_app_user_id_idx
    ON equipment_items (app_user_id, updated_at DESC);
