package app.maplehelper.equipment;

import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class StarForceCalculator {

    private static final ArmorAccessoryStarForceValue[] ARMOR_ACCESSORY_VALUES = {
            value(0, 0, 0, 0, 0, 0, 0),
            value(2, 5, 0, 0, 0, 0, 0),
            value(4, 10, 0, 0, 0, 0, 0),
            value(6, 15, 0, 0, 0, 1, 1),
            value(8, 25, 0, 0, 0, 2, 2),
            value(10, 35, 0, 0, 1, 3, 3),
            value(13, 50, 0, 0, 1, 4, 4),
            value(16, 65, 0, 0, 2, 5, 5),
            value(19, 85, 0, 0, 2, 6, 6),
            value(22, 105, 0, 0, 3, 7, 7),
            value(25, 130, 0, 0, 3, 8, 8),
            value(28, 155, 0, 0, 4, 10, 10),
            value(31, 180, 0, 0, 4, 12, 12),
            value(34, 205, 0, 0, 5, 14, 14),
            value(37, 230, 0, 0, 6, 16, 16),
            value(40, 255, 0, 0, 7, 18, 18),
    };

    private static final Map<LevelBand, ArmorAccessoryStarForceValue[]> ARMOR_ACCESSORY_HIGH_STAR_VALUES = Map.of(
            new LevelBand(128, 137), highStarValues(new int[][]{
                    {47, 255, 7}, {54, 255, 15}, {61, 255, 24}, {68, 255, 34}, {75, 255, 45}
            }),
            new LevelBand(138, 149), highStarValues(new int[][]{
                    {49, 255, 8}, {58, 255, 17}, {67, 255, 27}, {76, 255, 38}, {85, 255, 50},
                    {94, 255, 63}, {103, 255, 78}, {103, 255, 95}, {103, 255, 114}, {103, 255, 135},
                    {103, 255, 157}, {103, 255, 180}, {103, 255, 204}, {103, 255, 229}, {103, 255, 255}
            }),
            new LevelBand(150, 159), highStarValues(new int[][]{
                    {51, 255, 9}, {62, 255, 19}, {73, 255, 30}, {84, 255, 42}, {95, 255, 55},
                    {106, 255, 69}, {117, 255, 85}, {117, 255, 103}, {117, 255, 123}, {117, 255, 145},
                    {117, 255, 168}, {117, 255, 192}, {117, 255, 217}, {117, 255, 243}, {117, 255, 270}
            }),
            new LevelBand(160, 199), highStarValues(new int[][]{
                    {53, 255, 10}, {66, 255, 21}, {79, 255, 33}, {92, 255, 46}, {105, 255, 60},
                    {118, 255, 75}, {131, 255, 92}, {131, 255, 111}, {131, 255, 132}, {131, 255, 155},
                    {131, 255, 179}, {131, 255, 204}, {131, 255, 230}, {131, 255, 257}, {131, 255, 285}
            }),
            new LevelBand(200, 249), highStarValues(new int[][]{
                    {55, 255, 12}, {70, 255, 25}, {85, 255, 39}, {100, 255, 54}, {115, 255, 70},
                    {130, 255, 87}, {145, 255, 106}, {145, 255, 127}, {145, 255, 150}, {145, 255, 175},
                    {145, 255, 201}, {145, 255, 228}, {145, 255, 256}, {145, 255, 285}, {145, 255, 315}
            }),
            new LevelBand(250, 300), highStarValues(new int[][]{
                    {57, 255, 14}, {74, 255, 29}, {91, 255, 45}, {108, 255, 62}, {125, 255, 80},
                    {142, 255, 99}, {159, 255, 120}, {159, 255, 143}, {159, 255, 168}, {159, 255, 195},
                    {159, 255, 223}, {159, 255, 252}, {159, 255, 282}, {159, 255, 313}, {159, 255, 345}
            })
    );

    public int contribution(CatalogEquipmentFacts item, EquipmentStat stat, int starForce) {
        if (item.starForceProfile() == StarForceProfile.NONE || starForce <= 0) {
            return 0;
        }

        if (item.levelRequirement() == null) {
            return 0;
        }

        return switch (item.starForceProfile()) {
            case ARMOR_ACCESSORY, NORMAL -> armorAccessoryContribution(item, stat, starForce);
            case WEAPON, SUPERIOR, BADGE, NONE -> 0;
        };
    }

    private int armorAccessoryContribution(CatalogEquipmentFacts item, EquipmentStat stat, int starForce) {
        ArmorAccessoryStarForceValue value = armorAccessoryValue(item.levelRequirement(), starForce);
        if (value == null) {
            return 0;
        }

        return switch (stat) {
            case STR, DEX, INT, LUK -> isClassRelevantStat(item, stat) ? value.classStat() : 0;
            case MAX_HP, MAX_MP -> receivesHpMpStarForce(item.slot()) ? value.maxHpMp() : 0;
            case ATTACK_POWER, MAGIC_ATTACK -> value.attack()
                    + (item.slot() == EquipmentSlot.GLOVES
                    && item.baseStats().getOrDefault(stat, 0) > 0
                    ? value.glovesAttack()
                    : 0);
            case SPEED -> item.slot() == EquipmentSlot.SHOES ? value.shoesSpeed() : 0;
            case JUMP -> item.slot() == EquipmentSlot.SHOES ? value.shoesJump() : 0;
            case DEFENSE, ALL_STATS, BOSS_DAMAGE, DAMAGE, ENEMY_DEFENSE_IGNORED -> 0;
        };
    }

    private ArmorAccessoryStarForceValue armorAccessoryValue(int levelRequirement, int starForce) {
        if (starForce <= 15) {
            return ARMOR_ACCESSORY_VALUES[starForce];
        }

        return ARMOR_ACCESSORY_HIGH_STAR_VALUES.entrySet().stream()
                .filter(entry -> entry.getKey().contains(levelRequirement))
                .findFirst()
                .map(Map.Entry::getValue)
                .filter(values -> starForce - 16 < values.length)
                .map(values -> values[starForce - 16])
                .orElse(null);
    }

    private boolean isClassRelevantStat(CatalogEquipmentFacts item, EquipmentStat stat) {
        return item.baseStats().getOrDefault(stat, 0) > 0;
    }

    private boolean receivesHpMpStarForce(EquipmentSlot slot) {
        return slot != EquipmentSlot.GLOVES
                && slot != EquipmentSlot.SHOES
                && slot != EquipmentSlot.FACE
                && slot != EquipmentSlot.EYE;
    }

    private static ArmorAccessoryStarForceValue value(
            int classStat,
            int maxHpMp,
            int attack,
            int magicAttack,
            int glovesAttack,
            int shoesSpeed,
            int shoesJump) {
        return new ArmorAccessoryStarForceValue(
                classStat,
                maxHpMp,
                Math.max(attack, magicAttack),
                glovesAttack,
                shoesSpeed,
                shoesJump);
    }

    private static ArmorAccessoryStarForceValue[] highStarValues(int[][] rows) {
        ArmorAccessoryStarForceValue[] values = new ArmorAccessoryStarForceValue[rows.length];
        for (int index = 0; index < rows.length; index++) {
            values[index] = value(rows[index][0], rows[index][1], rows[index][2], rows[index][2], 7, 18, 18);
        }

        return values;
    }

    private record ArmorAccessoryStarForceValue(
            int classStat,
            int maxHpMp,
            int attack,
            int glovesAttack,
            int shoesSpeed,
            int shoesJump) {
    }

    private record LevelBand(int min, int max) {

        boolean contains(int level) {
            return min <= level && level <= max;
        }
    }
}
