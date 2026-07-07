ALTER TABLE equipment_catalog_items
    ADD COLUMN family_key VARCHAR(80),
    ADD COLUMN variant_group VARCHAR(40);

CREATE INDEX idx_equipment_catalog_items_family_key
    ON equipment_catalog_items(family_key);

UPDATE equipment_catalog_items
SET family_key = 'ROOT_ABYSS',
    variant_group = COALESCE(job_group, 'CLASS_VARIANT')
WHERE set_name = 'Root Abyss'
   OR name IN ('Chaos Root Abyss', 'Fafnir')
   OR name LIKE 'Royal %'
   OR name LIKE 'Eagle Eye %'
   OR name LIKE 'Trixter %';

UPDATE equipment_catalog_items
SET family_key = 'ABSOLAB',
    variant_group = COALESCE(job_group, 'CLASS_VARIANT')
WHERE set_name = 'Absolab'
   OR name = 'Absolab'
   OR name LIKE 'Absolab %';

UPDATE equipment_catalog_items
SET family_key = 'ARCANE_UMBRA',
    variant_group = COALESCE(job_group, 'CLASS_VARIANT')
WHERE set_name = 'Arcane Umbra'
   OR name = 'Arcane'
   OR name LIKE 'Arcane Umbra %';

UPDATE equipment_catalog_items
SET family_key = 'ETERNAL',
    variant_group = COALESCE(job_group, 'CLASS_VARIANT')
WHERE set_name = 'Eternal'
   OR name = 'Eternal'
   OR name LIKE 'Eternal %';

UPDATE equipment_catalog_items
SET family_key = 'PITCHED_BOSS',
    variant_group = COALESCE(job_group, 'EXACT')
WHERE set_name = 'Pitched Boss';

UPDATE equipment_catalog_items
SET family_key = 'BRILLIANT_BOSS',
    variant_group = COALESCE(job_group, 'EXACT')
WHERE set_name = 'Brilliant Boss';

UPDATE equipment_catalog_items
SET family_key = 'GOLLUX',
    variant_group = COALESCE(job_group, 'EXACT')
WHERE set_name = 'Gollux';

INSERT INTO equipment_catalog_items (
    slot,
    name,
    level_requirement,
    progression_stage,
    set_name,
    family_key,
    variant_group,
    job_group,
    name_pattern,
    base_stats,
    star_force_profile,
    notes
)
VALUES
    (
        'HEART',
        'Total Control',
        200,
        'endgame',
        'Pitched Boss',
        'PITCHED_BOSS',
        'EXACT',
        NULL,
        FALSE,
        '{"STR":25,"DEX":25,"INT":25,"LUK":25,"All Stats":25,"Max HP":1250,"Attack Power":15,"Magic Attack":15,"Enemy Defense Ignored":30}'::jsonb,
        'NONE',
        'Base stats from MapleStory Wiki Pitched Boss Set.'
    )
ON CONFLICT (slot, name) DO UPDATE SET
    level_requirement = EXCLUDED.level_requirement,
    progression_stage = EXCLUDED.progression_stage,
    set_name = EXCLUDED.set_name,
    family_key = EXCLUDED.family_key,
    variant_group = EXCLUDED.variant_group,
    base_stats = EXCLUDED.base_stats,
    star_force_profile = EXCLUDED.star_force_profile,
    notes = EXCLUDED.notes;
