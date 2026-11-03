DELETE FROM equipment_catalog_items
WHERE slot = 'EMBLEM' AND lower(name) IN ('generic lv100', 'lv. 100 class emblem');

INSERT INTO equipment_catalog_items
  (slot, name, level_requirement, progression_stage, variant_group, job_group, name_pattern, base_stats, star_force_profile, notes, maple_item_id)
VALUES
  ('EMBLEM','Gold Maple Leaf Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 class emblem.',1190301),
  ('EMBLEM','Gold Cygnus Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 class emblem.',1190801),
  ('EMBLEM','Gold Heroes Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 class emblem.',1190513),
  ('EMBLEM','Gold Resistance Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 class emblem.',1190601),
  ('EMBLEM','Gold Demon Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Max HP":500,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 class emblem.',1190701),
  ('EMBLEM','Hybrid Heart',100,'early','EXACT',NULL,0,'{"Max HP":300,"Max MP":100,"Attack Power":2,"Magic Attack":2,"Defense":100}','NONE','MapleStory.io GMS v270 Xenon emblem.',1190201),
  ('EMBLEM','Dragon Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 Kaiser emblem.',1190001),
  ('EMBLEM','Angel Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"Max HP":400,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 Angelic Buster emblem.',1190101),
  ('EMBLEM','Gold Agent Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 Cadena emblem.',1190530),
  ('EMBLEM','Gold Hitman Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 Kain emblem.',1190554),
  ('EMBLEM','Gold Knight''s Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 Adele emblem.',1190552),
  ('EMBLEM','Gold Crystal Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 Illium emblem.',1190532),
  ('EMBLEM','Gold Chaser Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 Khali emblem.',1190563),
  ('EMBLEM','Gold Abyssal Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 Ark emblem.',1190540),
  ('EMBLEM','Eternal Time Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 Zero emblem.',1190900),
  ('EMBLEM','Gold Kinesis Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 Kinesis emblem.',1191001),
  ('EMBLEM','Gold Crescent Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 Hayato emblem.',1191101),
  ('EMBLEM','Gold Blossom Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 Kanna emblem.',1191103),
  ('EMBLEM','Gold Earthseer Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 Lara emblem.',1190561),
  ('EMBLEM','Gold Three Paths Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 Hoyoung emblem.',1190550),
  ('EMBLEM','Gold Forest Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 Lynn emblem.',1191109),
  ('EMBLEM','Gold Xuanshan School Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 Mo Xuan emblem.',1191111),
  ('EMBLEM','Gold Guardian Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 Sia Astelle emblem.',1191113),
  ('EMBLEM','Gold Sword Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 Ren emblem.',1190565),
  ('EMBLEM','Gold Knight Emblem',100,'early','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 Erel Light emblem.',1191115),
  ('EMBLEM','Gold Astro Emblem',100,'legacy','EXACT',NULL,0,'{"STR":10,"DEX":10,"INT":10,"LUK":10,"Attack Power":2,"Magic Attack":2}','NONE','MapleStory.io GMS v270 Jett emblem.',1191107)
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
