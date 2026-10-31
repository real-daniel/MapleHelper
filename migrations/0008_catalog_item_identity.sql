ALTER TABLE equipment_catalog_items ADD COLUMN maple_item_id INTEGER;

CREATE UNIQUE INDEX equipment_catalog_maple_item_uq
  ON equipment_catalog_items(maple_item_id)
  WHERE maple_item_id IS NOT NULL;

ALTER TABLE equipment_items
  ADD COLUMN catalog_item_id INTEGER REFERENCES equipment_catalog_items(id) ON DELETE SET NULL;

CREATE INDEX equipment_items_catalog_idx
  ON equipment_items(catalog_item_id);

-- The original seed duplicated these five items in unindexed pseudo-slots. The
-- indexed records contain the complete base stats and are already returned for
-- every real ring/pendant position.
DELETE FROM equipment_catalog_items
WHERE slot IN ('RING', 'PENDANT')
  AND EXISTS (
    SELECT 1
    FROM equipment_catalog_items candidate
    WHERE candidate.name = equipment_catalog_items.name
      AND candidate.slot LIKE equipment_catalog_items.slot || '\_%' ESCAPE '\'
  );
