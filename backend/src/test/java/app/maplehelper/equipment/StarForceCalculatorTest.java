package app.maplehelper.equipment;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class StarForceCalculatorTest {

    private final StarForceCalculator calculator = new StarForceCalculator();

    @Test
    void computesLevel250ArmorAccessoryFromWikiCumulativeTable() {
        CatalogEquipmentFacts pants = new CatalogEquipmentFacts(
                "Eternal Knight Pants",
                EquipmentSlot.BOTTOM,
                250,
                StarForceProfile.ARMOR_ACCESSORY,
                Map.of(
                        EquipmentStat.STR, 50,
                        EquipmentStat.DEX, 50,
                        EquipmentStat.ATTACK_POWER, 6));

        assertThat(calculator.contribution(pants, EquipmentStat.STR, 22)).isEqualTo(159);
        assertThat(calculator.contribution(pants, EquipmentStat.ATTACK_POWER, 22)).isEqualTo(120);
        assertThat(calculator.contribution(pants, EquipmentStat.ATTACK_POWER, 24)).isEqualTo(168);
        assertThat(calculator.contribution(pants, EquipmentStat.MAX_HP, 24)).isEqualTo(255);
    }

    @Test
    void computesLevel180ArmorAccessoryFromWikiCumulativeTable() {
        CatalogEquipmentFacts tattoo = new CatalogEquipmentFacts(
                "Sweetwater Tattoo",
                EquipmentSlot.FACE,
                180,
                StarForceProfile.ARMOR_ACCESSORY,
                Map.of(
                        EquipmentStat.STR, 5,
                        EquipmentStat.DEX, 5,
                        EquipmentStat.INT, 5,
                        EquipmentStat.LUK, 5));

        assertThat(calculator.contribution(tattoo, EquipmentStat.STR, 22)).isEqualTo(131);
        assertThat(calculator.contribution(tattoo, EquipmentStat.ATTACK_POWER, 22)).isEqualTo(92);
        assertThat(calculator.contribution(tattoo, EquipmentStat.MAX_HP, 22)).isZero();
    }

    @Test
    void onlyAppliesClassStatsThatAreRelevantToTheItem() {
        CatalogEquipmentFacts warriorBottom = new CatalogEquipmentFacts(
                "Eternal Knight Pants",
                EquipmentSlot.BOTTOM,
                250,
                StarForceProfile.ARMOR_ACCESSORY,
                Map.of(
                        EquipmentStat.STR, 50,
                        EquipmentStat.DEX, 50,
                        EquipmentStat.INT, 0,
                        EquipmentStat.LUK, 0));

        assertThat(calculator.contribution(warriorBottom, EquipmentStat.STR, 24)).isEqualTo(159);
        assertThat(calculator.contribution(warriorBottom, EquipmentStat.INT, 24)).isZero();
    }
}
