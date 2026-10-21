-- Exact records used by the legacy deterministic Star Force and flame calculators.
-- The broader progression catalog contains family placeholders for these items,
-- but exact base stats are required to subtract base and Star Force contributions.
INSERT INTO equipment_catalog_items
  (slot, name, level_requirement, progression_stage, set_name, family_key, variant_group,
   job_group, name_pattern, base_stats, star_force_profile, notes)
VALUES
  ('BOTTOM', 'Eternal Knight Pants', 250, 'endgame', 'Eternal', 'ETERNAL', NULL,
   'Warrior', 0,
   '{"STR":50,"DEX":50,"INT":0,"LUK":0,"All Stats":0,"Max HP":0,"Attack Power":6,"Magic Attack":0,"Defense":325}',
   'ARMOR_ACCESSORY', 'Exact legacy calculator facts.'),
  ('SHOES', 'Eternal Knight Shoes', 250, 'endgame', 'Eternal', 'ETERNAL', NULL,
   'Warrior', 0,
   '{"STR":55,"DEX":55,"INT":0,"LUK":0,"All Stats":0,"Attack Power":12,"Magic Attack":0,"Defense":325,"Speed":10,"Jump":7}',
   'ARMOR_ACCESSORY', 'Exact legacy calculator facts.'),
  ('GLOVES', 'Eternal Knight Gloves', 250, 'endgame', 'Eternal', 'ETERNAL', NULL,
   'Warrior', 0,
   '{"STR":55,"DEX":55,"INT":0,"LUK":0,"All Stats":0,"Attack Power":12,"Magic Attack":0,"Defense":325}',
   'ARMOR_ACCESSORY', 'Exact legacy calculator facts.'),
  ('WEAPON', 'Destiny Bladecaster', 250, 'endgame', NULL, NULL, NULL,
   'Warrior', 0,
   '{"STR":190,"DEX":190,"INT":0,"LUK":0,"All Stats":0,"Attack Power":373,"Magic Attack":0,"Boss Damage":30,"Enemy Defense Ignored":20}',
   'WEAPON', 'Exact legacy calculator facts.')
ON CONFLICT(slot, name) DO UPDATE SET
  level_requirement = excluded.level_requirement,
  base_stats = excluded.base_stats,
  star_force_profile = excluded.star_force_profile,
  notes = excluded.notes;
