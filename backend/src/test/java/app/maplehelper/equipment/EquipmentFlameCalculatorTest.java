package app.maplehelper.equipment;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EquipmentFlameCalculatorTest {

    private final EquipmentFlameCalculator calculator = new EquipmentFlameCalculator(
            new CatalogEquipmentFactsProvider(),
            new EquipmentStatLineParser(),
            new StarForceCalculator());

    @Test
    void derivesEternalKnightPantsFlamesFromBaseAndStarForceStats() {
        ParsedEquipmentText parsed = parsed(
                EquipmentSlot.BOTTOM,
                "Eternal Knight Pants",
                250,
                22,
                """
                        STR +332 (50 +159 +123)
                        DEX +244 (50 +159 +35)
                        INT +28 (0 +28)
                        All Stats +5% (0% +5%)
                        Max HP +258 (0 +256)
                        Attack Power +174 (6 +168)
                        Magic ATT +168 (0 +168)
                        Defense +1070 (325 +745)
                        """);

        assertThat(calculator.deriveFlameStats(parsed))
                .isEqualTo("STR: +123\nDEX: +35\nINT: +28\nAll Stats: +5%");
    }

    @Test
    void derivesSweetwaterTattooFlamesWithoutTreatingYellowAttackAsFlame() {
        ParsedEquipmentText parsed = parsed(
                EquipmentSlot.FACE,
                "Sweetwater Tattoo",
                180,
                22,
                """
                        STR +187 (5 +131 +51)
                        DEX +136 (5 +131)
                        INT +151 (5 +131 +15)
                        LUK +136 (5 +131)
                        Attack Power +92 (0 +92)
                        Magic ATT +95 (0 +92 +3)
                        Defense +132 (108 +24)
                        """);

        assertThat(calculator.deriveFlameStats(parsed))
                .isEqualTo("STR: +51\nINT: +15\nMagic Attack: +3");
    }

    @Test
    void ignoresTinyOcrDeltaAroundExpectedZeroFlame() {
        ParsedEquipmentText parsed = parsed(
                EquipmentSlot.BOTTOM,
                "Eternal Knight Pants",
                250,
                22,
                "Max HP +258 (0 +256)");

        assertThat(calculator.deriveFlameStats(parsed)).isBlank();
    }

    private ParsedEquipmentText parsed(
            EquipmentSlot slot,
            String name,
            Integer levelRequirement,
            Integer starForce,
            String statLines) {
        return new ParsedEquipmentText(
                slot,
                name,
                levelRequirement,
                starForce,
                statLines,
                "",
                "",
                "",
                "",
                "");
    }
}
