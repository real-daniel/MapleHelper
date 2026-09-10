ALTER TABLE equipment_items
    ADD COLUMN slot_index INTEGER;

DROP INDEX IF EXISTS uq_equipment_catalog_items_slot_name;

UPDATE equipment_items
SET slot_index = CASE
        WHEN slot LIKE 'RING_%' THEN substring(slot from 'RING_([0-9]+)')::integer
        WHEN slot LIKE 'PENDANT_%' THEN substring(slot from 'PENDANT_([0-9]+)')::integer
        WHEN slot LIKE 'TOTEM_%' THEN substring(slot from 'TOTEM_([0-9]+)')::integer
        ELSE NULL
    END,
    slot = CASE
        WHEN slot LIKE 'RING_%' THEN 'RING'
        WHEN slot LIKE 'PENDANT_%' THEN 'PENDANT'
        WHEN slot LIKE 'TOTEM_%' THEN 'TOTEM'
        ELSE slot
    END;

UPDATE equipment_catalog_items
SET slot = CASE
        WHEN slot LIKE 'RING_%' THEN 'RING'
        WHEN slot LIKE 'PENDANT_%' THEN 'PENDANT'
        WHEN slot LIKE 'TOTEM_%' THEN 'TOTEM'
        ELSE slot
    END;

DELETE FROM equipment_catalog_items duplicate
USING equipment_catalog_items keeper
WHERE duplicate.id > keeper.id
  AND duplicate.slot = keeper.slot
  AND duplicate.name = keeper.name
  AND duplicate.level_requirement IS NOT DISTINCT FROM keeper.level_requirement;

DROP INDEX IF EXISTS idx_equipment_items_slot;
CREATE INDEX idx_equipment_items_slot ON equipment_items(slot, slot_index);

CREATE UNIQUE INDEX IF NOT EXISTS uq_equipment_catalog_items_slot_name
    ON equipment_catalog_items(slot, name);
