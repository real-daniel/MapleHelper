CREATE TABLE character_profiles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL,
    world VARCHAR(40) NOT NULL,
    job VARCHAR(80) NOT NULL,
    region VARCHAR(32) NOT NULL,
    weekly_rank BIGINT,
    weekly_experience BIGINT,
    image_url TEXT,
    source_url TEXT NOT NULL,
    retrieved_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX character_profiles_name_region_uq
    ON character_profiles (LOWER(name), region);

CREATE INDEX character_profiles_updated_at_idx
    ON character_profiles (updated_at DESC);
