ALTER TABLE equipment_catalog_items
    ADD COLUMN base_stats JSONB,
    ADD COLUMN star_force_profile VARCHAR(40) NOT NULL DEFAULT 'NORMAL';

UPDATE equipment_catalog_items
SET base_stats = '{"STR":50,"DEX":50,"INT":0,"LUK":0,"All Stats":0,"Max HP":0,"Attack Power":6,"Magic Attack":0,"Defense":325}'::jsonb
WHERE name = 'Eternal % Bottom';

UPDATE equipment_catalog_items
SET base_stats = '{"STR":55,"DEX":55,"INT":0,"LUK":0,"All Stats":0,"Attack Power":12,"Magic Attack":0,"Defense":325,"Speed":10,"Jump":7}'::jsonb
WHERE name = 'Eternal % Shoes';

UPDATE equipment_catalog_items
SET base_stats = '{"STR":5,"DEX":5,"INT":5,"LUK":5,"Attack Power":0,"Magic Attack":0,"Defense":108}'::jsonb
WHERE name = 'Sweetwater Tattoo';
