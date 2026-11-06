INSERT INTO equipment_catalog_items
  (slot, name, level_requirement, progression_stage, set_name, variant_group, job_group, name_pattern, base_stats, star_force_profile, notes, maple_item_id)
VALUES
  ('EARRINGS','Dea Sidus Earring',130,'early','Boss Accessory','EXACT',NULL,0,'{"STR":5,"DEX":5,"INT":5,"LUK":5,"Attack Power":2,"Magic Attack":2,"Defense":50}','ARMOR_ACCESSORY','MapleStory.io GMS v270 item identity and current GMS base stats.',1032241),
  ('EARRINGS','Superior Gollux Earrings',150,'late','Superior Gollux','EXACT',NULL,0,'{"STR":15,"DEX":15,"INT":15,"LUK":15,"Max HP":150,"Max MP":150,"Attack Power":10,"Magic Attack":10,"Defense":100}','ARMOR_ACCESSORY','MapleStory.io GMS v270 item identity and current GMS base stats.',1032223),
  ('EARRINGS','Estella Earrings',160,'late','Dawn Boss','EXACT',NULL,0,'{"STR":7,"DEX":7,"INT":7,"LUK":7,"Max HP":300,"Max MP":300,"Attack Power":2,"Magic Attack":2,"Defense":100}','ARMOR_ACCESSORY','MapleStory.io GMS v270 item identity and current GMS base stats.',1032311),
  ('EARRINGS','Commanding Force Earring',200,'endgame','Pitched Boss','EXACT',NULL,0,'{"STR":7,"DEX":7,"INT":7,"LUK":7,"Max HP":500,"Max MP":500,"Attack Power":5,"Magic Attack":5,"Defense":100}','ARMOR_ACCESSORY','MapleStory.io GMS v270 item identity and current GMS base stats.',1032316)
ON CONFLICT(slot, name) DO UPDATE SET
  level_requirement = excluded.level_requirement,
  progression_stage = excluded.progression_stage,
  set_name = excluded.set_name,
  variant_group = excluded.variant_group,
  job_group = excluded.job_group,
  name_pattern = excluded.name_pattern,
  base_stats = excluded.base_stats,
  star_force_profile = excluded.star_force_profile,
  notes = excluded.notes,
  maple_item_id = excluded.maple_item_id;
