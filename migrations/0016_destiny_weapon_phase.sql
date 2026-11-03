ALTER TABLE equipment_items ADD COLUMN destiny_stage INTEGER CHECK (destiny_stage IS NULL OR destiny_stage BETWEEN 1 AND 2);
