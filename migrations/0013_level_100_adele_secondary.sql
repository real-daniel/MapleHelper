INSERT INTO equipment_catalog_items
  (slot, name, level_requirement, progression_stage, variant_group, job_group, name_pattern, base_stats, star_force_profile, notes, maple_item_id)
VALUES
  ('SECONDARY','Noble Bladebinder',100,'early','EXACT','Warrior',0,'{"STR":10,"DEX":10,"Attack Power":3}','NONE','MapleStory.io GMS v270 Adele secondary.',1354003)
ON CONFLICT(slot, name) DO UPDATE SET
  level_requirement = excluded.level_requirement,
  progression_stage = excluded.progression_stage,
  variant_group = excluded.variant_group,
  job_group = excluded.job_group,
  name_pattern = excluded.name_pattern,
  base_stats = excluded.base_stats,
  star_force_profile = excluded.star_force_profile,
  notes = excluded.notes,
  maple_item_id = excluded.maple_item_id;
