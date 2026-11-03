INSERT INTO equipment_catalog_items
  (slot, name, level_requirement, progression_stage, variant_group, job_group, name_pattern, base_stats, star_force_profile, notes, maple_item_id)
VALUES
  ('RING','Ring of Restraint',110,'late','OZ_SKILL_RING',NULL,0,'{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}','NONE','MapleStory.io GMS v270 Special Skill Ring.',1113098),
  ('RING','Continuous Ring',110,'late','OZ_SKILL_RING',NULL,0,'{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}','NONE','MapleStory.io GMS v270 Special Skill Ring.',1113329),
  ('RING','Weapon Jump S Ring',110,'late','OZ_SKILL_RING',NULL,0,'{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}','NONE','MapleStory.io GMS v270 Special Skill Ring.',1113113),
  ('RING','Weapon Jump D Ring',110,'late','OZ_SKILL_RING',NULL,0,'{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}','NONE','MapleStory.io GMS v270 Special Skill Ring.',1113114),
  ('RING','Weapon Jump I Ring',110,'late','OZ_SKILL_RING',NULL,0,'{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}','NONE','MapleStory.io GMS v270 Special Skill Ring.',1113115),
  ('RING','Weapon Jump L Ring',110,'late','OZ_SKILL_RING',NULL,0,'{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}','NONE','MapleStory.io GMS v270 Special Skill Ring.',1113116),
  ('RING','Risk Taker Ring',110,'late','OZ_SKILL_RING',NULL,0,'{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}','NONE','MapleStory.io GMS v270 Special Skill Ring.',1113122),
  ('RING','Totalling Ring',110,'late','OZ_SKILL_RING',NULL,0,'{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}','NONE','MapleStory.io GMS v270 Special Skill Ring.',1113108),
  ('RING','Critical Damage Ring',110,'late','OZ_SKILL_RING',NULL,0,'{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}','NONE','MapleStory.io GMS v270 Special Skill Ring.',1113104),
  ('RING','Ultimatum Ring',110,'late','OZ_SKILL_RING',NULL,0,'{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}','NONE','MapleStory.io GMS v270 Special Skill Ring.',1113099),
  ('RING','Crisis HM Ring',110,'late','OZ_SKILL_RING',NULL,0,'{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}','NONE','MapleStory.io GMS v270 Special Skill Ring.',1113125),
  ('RING','Cleansing Ring',110,'late','OZ_SKILL_RING',NULL,0,'{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}','NONE','MapleStory.io GMS v270 Special Skill Ring.',1113121),
  ('RING','Overdrive Ring',110,'late','OZ_SKILL_RING',NULL,0,'{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}','NONE','MapleStory.io GMS v270 Special Skill Ring.',1113118),
  ('RING','Level Jump S Ring',110,'late','OZ_SKILL_RING',NULL,0,'{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}','NONE','MapleStory.io GMS v270 Special Skill Ring.',1113109),
  ('RING','Level Jump D Ring',110,'late','OZ_SKILL_RING',NULL,0,'{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}','NONE','MapleStory.io GMS v270 Special Skill Ring.',1113110),
  ('RING','Level Jump I Ring',110,'late','OZ_SKILL_RING',NULL,0,'{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}','NONE','MapleStory.io GMS v270 Special Skill Ring.',1113111),
  ('RING','Level Jump L Ring',110,'late','OZ_SKILL_RING',NULL,0,'{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}','NONE','MapleStory.io GMS v270 Special Skill Ring.',1113112),
  ('RING','Health Cut Ring',110,'late','OZ_SKILL_RING',NULL,0,'{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}','NONE','MapleStory.io GMS v270 Special Skill Ring.',1113101),
  ('RING','Critical Defense Ring',110,'late','OZ_SKILL_RING',NULL,0,'{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}','NONE','MapleStory.io GMS v270 Special Skill Ring.',1113105),
  ('RING','Limit Ring',110,'late','OZ_SKILL_RING',NULL,0,'{"STR":4,"DEX":4,"INT":4,"LUK":4,"Attack Power":4,"Magic Attack":4}','NONE','MapleStory.io GMS v270 Special Skill Ring.',1113100)
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
