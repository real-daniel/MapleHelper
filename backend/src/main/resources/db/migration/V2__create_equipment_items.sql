CREATE TABLE equipment_items (
    id BIGSERIAL PRIMARY KEY,
    character_profile_id BIGINT REFERENCES character_profiles(id) ON DELETE CASCADE,
    slot VARCHAR(40) NOT NULL,
    name VARCHAR(120) NOT NULL,
    level_requirement INTEGER,
    star_force INTEGER,
    stat_lines TEXT,
    potential_tier VARCHAR(30),
    potential_lines TEXT,
    bonus_potential_tier VARCHAR(30),
    bonus_potential_lines TEXT,
    raw_extracted_text TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_equipment_items_profile_id ON equipment_items(character_profile_id);
CREATE INDEX idx_equipment_items_slot ON equipment_items(slot);
