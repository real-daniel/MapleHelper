ALTER TABLE equipment_items ADD COLUMN astra_stage INTEGER CHECK (astra_stage IS NULL OR astra_stage BETWEEN 1 AND 3);

UPDATE equipment_catalog_items
SET level_requirement = 200,
    notes = 'Astra Secondary Weapon. Liberation stages I, II, and III allow 15, 20, and 30 Star Force respectively; Astra Katara and Astra Talisman can reach 30 stars at every stage.'
WHERE slot = 'SECONDARY' AND name = 'Astra';

-- Gollux items use the standard Star Force system despite "Superior" being part of their item name.
UPDATE equipment_catalog_items
SET star_force_profile = 'ARMOR_ACCESSORY'
WHERE set_name = 'Gollux';
