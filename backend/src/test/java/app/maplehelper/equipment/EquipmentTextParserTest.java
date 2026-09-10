package app.maplehelper.equipment;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EquipmentTextParserTest {

    private final EquipmentTextParser parser = new EquipmentTextParser(new CatalogEquipmentFactsProvider());

    @Test
    void usesFuzzyCatalogNameToRecoverCanonicalNameAndSlot() {
        ParsedEquipmentText parsed = parser.parse("""
                S0urce of Sufferlng
                Untradable
                Required Level Lv. 160
                Accessary
                Pendant
                S7R +225 (10 +131 +84)
                Attack P0wer +158 (3 +155)
                """, 25);

        assertThat(parsed.name()).isEqualTo("Source of Suffering");
        assertThat(parsed.slot()).isEqualTo(EquipmentSlot.PENDANT);
        assertThat(parsed.statLines()).contains("STR +225 (10 +131 +84)");
        assertThat(parsed.statLines()).contains("Attack Power +158 (3 +155)");
    }

    @Test
    void doesNotDefaultAnUnrecognizedSlotToWeapon() {
        ParsedEquipmentText parsed = parser.parse("""
                Unknown Thing
                Untradable
                Required Level Lv. 100
                """, 0);

        assertThat(parsed.slot()).isNull();
    }

    @Test
    void recognizesOzRingNameFromSpecialSkillText() {
        ParsedEquipmentText parsed = parser.parse("""
                Ring of Restraint
                Untradable
                Accessory
                Ring
                Required Level Lv. 110
                Usable Skill [Special Skill Ring] Ring of Restraint Lv. 5
                Star Force, Bonus Stats Can't Enhance
                Potential : Can't Enhance
                Can't Equip Duplicate (Special Skill Ring) Items
                """, null);

        assertThat(parsed.name()).isEqualTo("Ring of Restraint");
        assertThat(parsed.slot()).isEqualTo(EquipmentSlot.RING);
    }

    @Test
    void stopsPotentialParsingAtSoulSection() {
        ParsedEquipmentText parsed = parser.parse("""
                Destiny Bladecaster
                Untradable
                Weapon
                Bladecaster
                Required Level Lv. 250
                Attack Power +902 (373 +261 +268)
                Boss Damage +40% (30% +10%)
                Potential : Legendary
                Boss Damage +45%
                Attack Power +13%
                Attack Power +10%
                Soul : Magnificent Annihilation Weapon Lotus Soul
                Attack Power +3%
                Grants [Dark Energy] Skill
                """, 0);

        assertThat(parsed.name()).isEqualTo("Destiny Bladecaster");
        assertThat(parsed.slot()).isEqualTo(EquipmentSlot.WEAPON);
        assertThat(parsed.flameStats()).contains("Attack Power: +268");
        assertThat(parsed.flameStats()).contains("Boss Damage: +10%");
        assertThat(parsed.potentialLines()).contains("Boss Damage: +45%");
        assertThat(parsed.potentialLines()).contains("Attack Power: +13%");
        assertThat(parsed.potentialLines()).contains("Attack Power: +10%");
        assertThat(parsed.potentialLines()).doesNotContain("Attack Power: +3%");
    }
}
