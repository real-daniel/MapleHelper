package app.maplehelper.equipment;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EquipmentFlameCalculatorTest {

    private final EquipmentFlameCalculator calculator = new EquipmentFlameCalculator(
            new CatalogEquipmentFactsProvider(),
            new EquipmentStatLineParser(),
            new StarForceCalculator(),
            new FlameLineSolver(new BonusStatTables()));

    @Test
    void derivesEternalKnightPantsFlamesFromBaseAndStarForceStats() {
        ParsedEquipmentText parsed = parsed(
                EquipmentSlot.BOTTOM,
                "Eternal Knight Pants",
                250,
                24,
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
                .isEqualTo(String.join(System.lineSeparator(), "STR: +123", "DEX: +35", "INT: +28", "All Stats: +5%"));
    }

    @Test
    void derivesSweetwaterTattooFlamesWithoutTreatingYellowAttackAsFlame() {
        ParsedEquipmentText parsed = parsed(
                EquipmentSlot.FACE,
                "Sweetwater Tattoo",
                160,
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
                .isEqualTo(String.join(System.lineSeparator(), "STR: +51", "INT: +15", "Magic Attack: +3"));
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

    @Test
    void solvesHiddenFlameLinesFromDisplayedTotals() {
        ParsedEquipmentText parsed = parsed(
                EquipmentSlot.PENDANT_1,
                "Source of Suffering",
                160,
                25,
                """
                        STR +225 (10 +131 +84)
                        DEX +171 (10 +131 +30)
                        INT +141 (10 +131)
                        LUK +141 (10 +131)
                        All Stats +6% (0% +6%)
                        Attack Power +158 (3 +155)
                        Magic ATT +158 (3 +155)
                        Speed +5 (0 +5)
                        """);

        assertThat(calculator.deriveFlameStats(parsed))
                .isEqualTo(String.join(System.lineSeparator(), "STR: +84", "DEX: +30", "All Stats: +6%", "Speed: +5"));
        assertThat(calculator.deriveFlameScoreLines(parsed))
                .isEqualTo(String.join(System.lineSeparator(),
                        "All Stats: +6% (Tier 6)",
                        "STR: +54 (Tier 6)",
                        "STR & DEX: +30 (Tier 6)",
                        "Speed: +5 (Tier 5)"));
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
