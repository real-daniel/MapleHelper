package app.maplehelper.equipment;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class BonusStatTables {

    private static final int MAX_TIER = 7;
    private static final EquipmentStat[] MAIN_STATS = {
            EquipmentStat.STR,
            EquipmentStat.DEX,
            EquipmentStat.INT,
            EquipmentStat.LUK
    };

    public List<FlameLineCandidate> candidates(CatalogEquipmentFacts item) {
        if (item.levelRequirement() == null || item.starForceProfile() == StarForceProfile.NONE) {
            return List.of();
        }

        List<FlameLineCandidate> candidates = new ArrayList<>();
        int singleStatUnit = singleStatUnit(item.levelRequirement());
        int dualStatUnit = dualStatUnit(item.levelRequirement());
        for (EquipmentStat stat : MAIN_STATS) {
            for (int tier = 1; tier <= MAX_TIER; tier++) {
                candidates.add(new FlameLineCandidate(stat.label(), tier, FlameStatVector.of(stat, singleStatUnit * tier)));
            }
        }

        for (int first = 0; first < MAIN_STATS.length; first++) {
            for (int second = first + 1; second < MAIN_STATS.length; second++) {
                EquipmentStat firstStat = MAIN_STATS[first];
                EquipmentStat secondStat = MAIN_STATS[second];
                for (int tier = 1; tier <= MAX_TIER; tier++) {
                    candidates.add(new FlameLineCandidate(
                            firstStat.label() + " & " + secondStat.label(),
                            tier,
                            FlameStatVector.of(firstStat, secondStat, dualStatUnit * tier)));
                }
            }
        }

        if (item.levelRequirement() >= 70) {
            for (int tier = 1; tier <= MAX_TIER; tier++) {
                candidates.add(new FlameLineCandidate("All Stats", tier, FlameStatVector.of(EquipmentStat.ALL_STATS, tier)));
            }
        }

        for (int tier = 1; tier <= MAX_TIER; tier++) {
            if (item.slot() == EquipmentSlot.WEAPON) {
                addWeaponAttackCandidate(candidates, item, EquipmentStat.ATTACK_POWER, "Attack Power", tier);
                addWeaponAttackCandidate(candidates, item, EquipmentStat.MAGIC_ATTACK, "Magic Attack", tier);
                if (item.levelRequirement() >= 90) {
                    candidates.add(new FlameLineCandidate("Boss Damage", tier, FlameStatVector.of(EquipmentStat.BOSS_DAMAGE, tier * 2)));
                }
                candidates.add(new FlameLineCandidate("Damage", tier, FlameStatVector.of(EquipmentStat.DAMAGE, tier)));
            } else {
                candidates.add(new FlameLineCandidate("Attack Power", tier, FlameStatVector.of(EquipmentStat.ATTACK_POWER, tier)));
                candidates.add(new FlameLineCandidate("Magic Attack", tier, FlameStatVector.of(EquipmentStat.MAGIC_ATTACK, tier)));
                candidates.add(new FlameLineCandidate("Speed", tier, FlameStatVector.of(EquipmentStat.SPEED, tier)));
                candidates.add(new FlameLineCandidate("Jump", tier, FlameStatVector.of(EquipmentStat.JUMP, tier)));
            }
        }

        return candidates;
    }

    private void addWeaponAttackCandidate(
            List<FlameLineCandidate> candidates,
            CatalogEquipmentFacts item,
            EquipmentStat stat,
            String name,
            int tier) {
        int baseAttack = item.baseStats().getOrDefault(stat, 0);
        if (baseAttack <= 0 || tier < 3) {
            return;
        }

        candidates.add(new FlameLineCandidate(
                name,
                tier,
                FlameStatVector.of(stat, weaponAttackBonus(item.levelRequirement(), baseAttack, tier))));
    }

    private int weaponAttackBonus(int level, int baseAttack, int tier) {
        double multiplier = switch (weaponAttackLevelBand(level)) {
            case 0 -> new double[] { .03, .044, .0605, .0799, .1025 }[tier - 3];
            case 1 -> new double[] { .06, .088, .121, .1597, .205 }[tier - 3];
            case 2 -> new double[] { .09, .132, .1815, .2396, .3075 }[tier - 3];
            case 3 -> new double[] { .12, .176, .242, .3194, .4099 }[tier - 3];
            case 4 -> new double[] { .15, .22, .3025, .3993, .5124 }[tier - 3];
            case 5 -> new double[] { .18, .264, .363, .4792, .6149 }[tier - 3];
            default -> new double[] { .21, .308, .4235, .559, .7174 }[tier - 3];
        };

        return (int) Math.ceil(baseAttack * multiplier);
    }

    private int weaponAttackLevelBand(int level) {
        if (level < 40) return 0;
        if (level < 80) return 1;
        if (level < 120) return 2;
        if (level < 160) return 3;
        if (level < 200) return 4;
        if (level < 250) return 5;
        return 6;
    }

    private int singleStatUnit(int level) {
        if (level >= 230) {
            return 12;
        }

        return Math.max(1, level / 20 + 1);
    }

    private int dualStatUnit(int level) {
        if (level >= 250) {
            return 7;
        }

        if (level >= 200) {
            return 6;
        }

        return Math.max(1, level / 40 + 1);
    }
}
