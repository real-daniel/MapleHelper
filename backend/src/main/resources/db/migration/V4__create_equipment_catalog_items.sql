CREATE TABLE equipment_catalog_items (
    id BIGSERIAL PRIMARY KEY,
    slot VARCHAR(40) NOT NULL,
    name VARCHAR(160) NOT NULL,
    level_requirement INTEGER,
    progression_stage VARCHAR(40),
    set_name VARCHAR(80),
    job_group VARCHAR(40),
    name_pattern BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT
);

CREATE INDEX idx_equipment_catalog_items_slot ON equipment_catalog_items(slot);
CREATE INDEX idx_equipment_catalog_items_name ON equipment_catalog_items(name);

INSERT INTO equipment_catalog_items (
    slot, name, level_requirement, progression_stage, set_name, job_group, name_pattern, notes
)
SELECT ring_slots.slot, ring_items.name, ring_items.level_requirement, ring_items.progression_stage,
       ring_items.set_name, ring_items.job_group, ring_items.name_pattern, ring_items.notes
FROM (VALUES
    ('RING_1'), ('RING_2'), ('RING_3'), ('RING_4')
) AS ring_slots(slot)
CROSS JOIN (VALUES
    ('Silver Blossom Ring', 110, 'early', 'Boss Accessory', NULL, FALSE, NULL),
    ('Noble Ifia''s Ring', 120, 'early', NULL, NULL, FALSE, NULL),
    ('Kanna''s Treasure', 140, 'mid', 'Sengoku', NULL, FALSE, NULL),
    ('Meister Ring', 140, 'mid', NULL, NULL, FALSE, NULL),
    ('Solid Gollux Ring', 130, 'mid', 'Gollux', NULL, FALSE, NULL),
    ('Reinforced Gollux Ring', 140, 'mid', 'Gollux', NULL, FALSE, NULL),
    ('Superior Gollux Ring', 150, 'late', 'Gollux', NULL, FALSE, NULL),
    ('Guardian Angel Ring', 160, 'late', 'Dawn Boss', NULL, FALSE, NULL),
    ('Endless Terror', 200, 'endgame', 'Pitched Boss', NULL, FALSE, NULL),
    ('Event Ring', 120, 'event', NULL, NULL, TRUE, 'Generic event ring placeholder for manual entry.')
) AS ring_items(name, level_requirement, progression_stage, set_name, job_group, name_pattern, notes);

INSERT INTO equipment_catalog_items (
    slot, name, level_requirement, progression_stage, set_name, job_group, name_pattern, notes
)
SELECT pendant_slots.slot, pendant_items.name, pendant_items.level_requirement, pendant_items.progression_stage,
       pendant_items.set_name, pendant_items.job_group, pendant_items.name_pattern, pendant_items.notes
FROM (VALUES
    ('PENDANT_1'), ('PENDANT_2')
) AS pendant_slots(slot)
CROSS JOIN (VALUES
    ('Chaos Horntail Necklace', 120, 'early', 'Boss Accessory', NULL, FALSE, NULL),
    ('Mechanator Pendant', 120, 'early', 'Boss Accessory', NULL, FALSE, NULL),
    ('Dominator Pendant', 140, 'mid', 'Boss Accessory', NULL, FALSE, NULL),
    ('Superior Gollux Pendant', 150, 'late', 'Gollux', NULL, FALSE, NULL),
    ('Daybreak Pendant', 140, 'late', 'Dawn Boss', NULL, FALSE, NULL),
    ('Source of Suffering', 160, 'endgame', 'Pitched Boss', NULL, FALSE, NULL)
) AS pendant_items(name, level_requirement, progression_stage, set_name, job_group, name_pattern, notes);

INSERT INTO equipment_catalog_items (
    slot, name, level_requirement, progression_stage, set_name, job_group, name_pattern, notes
) VALUES
    ('WEAPON', 'Fafnir %', 150, 'mid', 'Root Abyss', NULL, TRUE, 'Class-specific CRA weapon.'),
    ('WEAPON', 'Absolab %', 160, 'mid', 'Absolab', NULL, TRUE, 'Class-specific Absolab weapon.'),
    ('WEAPON', 'Arcane Umbra %', 200, 'late', 'Arcane Umbra', NULL, TRUE, 'Class-specific Arcane weapon.'),
    ('WEAPON', 'Genesis %', 200, 'endgame', 'Genesis', NULL, TRUE, 'Liberated Genesis weapon.'),
    ('WEAPON', 'Eternal %', 250, 'endgame', 'Eternal', NULL, TRUE, 'Class-specific Eternal weapon placeholder.'),

    ('SECONDARY', 'Princess No Secondary', 140, 'mid', NULL, NULL, TRUE, 'Class-specific Princess No secondary placeholder.'),
    ('SECONDARY', 'Class Secondary', NULL, 'manual', NULL, NULL, TRUE, 'Manual-entry placeholder for class-specific secondaries.'),

    ('EMBLEM', 'Gold Maple Leaf Emblem', 100, 'early', NULL, NULL, FALSE, NULL),
    ('EMBLEM', 'Class Emblem', 100, 'manual', NULL, NULL, TRUE, 'Manual-entry placeholder for class-specific emblems.'),

    ('HAT', 'Pensalir % Hat', 140, 'early', 'Pensalir', NULL, TRUE, NULL),
    ('HAT', 'Royal % Hat', 150, 'mid', 'Root Abyss', NULL, TRUE, 'CRA hat family placeholder.'),
    ('HAT', 'Arcane Umbra % Hat', 200, 'late', 'Arcane Umbra', NULL, TRUE, NULL),
    ('HAT', 'Eternal % Hat', 250, 'endgame', 'Eternal', NULL, TRUE, NULL),

    ('FACE', 'Condensed Power Crystal', 110, 'early', 'Boss Accessory', NULL, FALSE, NULL),
    ('FACE', 'Twilight Mark', 140, 'late', 'Dawn Boss', NULL, FALSE, NULL),
    ('FACE', 'Sweetwater Tattoo', 160, 'late', 'Sweetwater', NULL, FALSE, NULL),
    ('FACE', 'Berserked', 160, 'endgame', 'Pitched Boss', NULL, FALSE, NULL),

    ('EYE', 'Aquatic Letter Eye Accessory', 100, 'early', 'Boss Accessory', NULL, FALSE, NULL),
    ('EYE', 'Black Bean Mark', 135, 'early', 'Boss Accessory', NULL, FALSE, NULL),
    ('EYE', 'Papulatus Mark', 145, 'mid', 'Boss Accessory', NULL, FALSE, NULL),
    ('EYE', 'Sweetwater Monocle', 160, 'late', 'Sweetwater', NULL, FALSE, NULL),
    ('EYE', 'Magic Eyepatch', 160, 'endgame', 'Pitched Boss', NULL, FALSE, NULL),

    ('EARRINGS', 'Dea Sidus Earrings', 130, 'early', 'Boss Accessory', NULL, FALSE, NULL),
    ('EARRINGS', 'Superior Gollux Earrings', 150, 'late', 'Gollux', NULL, FALSE, NULL),
    ('EARRINGS', 'Estella Earrings', 160, 'late', 'Dawn Boss', NULL, FALSE, NULL),
    ('EARRINGS', 'Commanding Force Earrings', 200, 'endgame', 'Pitched Boss', NULL, FALSE, NULL),

    ('TOP', 'Eagle Eye %', 150, 'mid', 'Root Abyss', NULL, TRUE, 'CRA top family placeholder.'),
    ('TOP', 'Eternal % Top', 250, 'endgame', 'Eternal', NULL, TRUE, 'Class-specific Eternal top placeholder.'),

    ('BOTTOM', 'Trixter %', 150, 'mid', 'Root Abyss', NULL, TRUE, 'CRA bottom family placeholder.'),
    ('BOTTOM', 'Eternal % Bottom', 250, 'endgame', 'Eternal', NULL, TRUE, 'Class-specific Eternal bottom placeholder.'),

    ('SHOES', 'Pensalir % Shoes', 140, 'early', 'Pensalir', NULL, TRUE, NULL),
    ('SHOES', 'Tyrant % Boots', 150, 'mid', 'Tyrant', NULL, TRUE, NULL),
    ('SHOES', 'Absolab % Shoes', 160, 'mid', 'Absolab', NULL, TRUE, NULL),
    ('SHOES', 'Arcane Umbra % Shoes', 200, 'late', 'Arcane Umbra', NULL, TRUE, NULL),
    ('SHOES', 'Eternal % Shoes', 250, 'endgame', 'Eternal', NULL, TRUE, NULL),

    ('GLOVES', 'Pensalir % Gloves', 140, 'early', 'Pensalir', NULL, TRUE, NULL),
    ('GLOVES', 'Tyrant % Gloves', 150, 'mid', 'Tyrant', NULL, TRUE, NULL),
    ('GLOVES', 'Absolab % Gloves', 160, 'mid', 'Absolab', NULL, TRUE, NULL),
    ('GLOVES', 'Arcane Umbra % Gloves', 200, 'late', 'Arcane Umbra', NULL, TRUE, NULL),
    ('GLOVES', 'Eternal % Gloves', 250, 'endgame', 'Eternal', NULL, TRUE, NULL),

    ('CAPE', 'Pensalir % Cape', 140, 'early', 'Pensalir', NULL, TRUE, NULL),
    ('CAPE', 'Tyrant % Cloak', 150, 'mid', 'Tyrant', NULL, TRUE, NULL),
    ('CAPE', 'Absolab % Cape', 160, 'mid', 'Absolab', NULL, TRUE, NULL),
    ('CAPE', 'Arcane Umbra % Cape', 200, 'late', 'Arcane Umbra', NULL, TRUE, NULL),
    ('CAPE', 'Eternal % Cape', 250, 'endgame', 'Eternal', NULL, TRUE, NULL),

    ('BELT', 'Golden Clover Belt', 140, 'early', 'Boss Accessory', NULL, FALSE, NULL),
    ('BELT', 'Tyrant % Belt', 150, 'mid', 'Tyrant', NULL, TRUE, NULL),
    ('BELT', 'Superior Gollux Belt', 150, 'late', 'Gollux', NULL, FALSE, NULL),
    ('BELT', 'Dreamy Belt', 200, 'endgame', 'Pitched Boss', NULL, FALSE, NULL),

    ('SHOULDER', 'Royal Black Metal Shoulder', 120, 'early', 'Boss Accessory', NULL, FALSE, NULL),
    ('SHOULDER', 'Hayato''s Treasure', 140, 'mid', 'Sengoku', NULL, FALSE, NULL),
    ('SHOULDER', 'Absolab % Shoulder', 160, 'mid', 'Absolab', NULL, TRUE, NULL),
    ('SHOULDER', 'Arcane Umbra % Shoulder', 200, 'late', 'Arcane Umbra', NULL, TRUE, NULL),
    ('SHOULDER', 'Eternal % Shoulder', 250, 'endgame', 'Eternal', NULL, TRUE, NULL),

    ('POCKET', 'Pink Holy Cup', 140, 'early', 'Boss Accessory', NULL, FALSE, NULL),
    ('POCKET', 'Cursed Spellbook', 160, 'endgame', 'Pitched Boss', NULL, TRUE, 'Class/stat-specific Cursed Spellbook placeholder.'),

    ('BADGE', 'Crystal Ventus Badge', 130, 'early', 'Boss Accessory', NULL, FALSE, NULL),
    ('BADGE', 'Ghost Ship Exorcist Badge', 150, 'legacy', NULL, NULL, FALSE, 'Legacy badge.'),
    ('BADGE', 'Sengoku Hakase Badge', 160, 'legacy', 'Sengoku', NULL, FALSE, 'Legacy badge.'),

    ('MEDAL', 'Seven Day Monster Parker', NULL, 'early', NULL, NULL, FALSE, 'Medals are kept as manual-friendly catalog entries.'),
    ('MEDAL', 'Antellion Guardian', NULL, 'mid', NULL, NULL, FALSE, 'Medals are kept as manual-friendly catalog entries.'),

    ('ANDROID', 'Android', NULL, 'manual', NULL, NULL, TRUE, 'Manual-entry placeholder for android appearance item.'),

    ('HEART', 'Lidium Heart', 30, 'early', NULL, NULL, FALSE, NULL),
    ('HEART', 'Titanium Heart', 100, 'mid', NULL, NULL, FALSE, NULL),
    ('HEART', 'Fairy Heart', 100, 'late', NULL, NULL, FALSE, NULL),
    ('HEART', 'Outlaw Heart', 150, 'legacy', NULL, NULL, FALSE, 'Legacy heart.'),

    ('TOTEM_1', 'Afterlands Totem', NULL, 'early', 'Afterlands', NULL, TRUE, 'Manual-entry placeholder.'),
    ('TOTEM_2', 'Afterlands Totem', NULL, 'early', 'Afterlands', NULL, TRUE, 'Manual-entry placeholder.'),
    ('TOTEM_3', 'Afterlands Totem', NULL, 'early', 'Afterlands', NULL, TRUE, 'Manual-entry placeholder.');
