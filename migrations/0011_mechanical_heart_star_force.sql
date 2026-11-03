UPDATE equipment_catalog_items
SET star_force_profile = 'ARMOR_ACCESSORY',
    notes = CASE
      WHEN notes IS NULL OR notes = '' THEN 'Mechanical Heart supports level-based Star Force enhancement.'
      ELSE notes || ' Mechanical Heart supports level-based Star Force enhancement.'
    END
WHERE slot = 'HEART' AND lower(name) <> 'black heart';

UPDATE equipment_catalog_items
SET star_force_profile = 'NONE',
    base_stats = '{"STR":50,"DEX":50,"INT":50,"LUK":50,"Max HP":100,"Attack Power":77,"Magic Attack":77}',
    notes = 'Fixed Black Heart stats: visually locked at 15 stars, with Epic Boss Damage +30% and Ignore Enemy Defense +30%; cannot be enhanced or reset.'
WHERE slot = 'HEART' AND lower(name) = 'black heart';
