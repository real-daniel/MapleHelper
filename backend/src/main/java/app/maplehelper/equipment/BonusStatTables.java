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
            candidates.add(new FlameLineCandidate("Attack Power", tier, FlameStatVector.of(EquipmentStat.ATTACK_POWER, tier)));
            candidates.add(new FlameLineCandidate("Magic Attack", tier, FlameStatVector.of(EquipmentStat.MAGIC_ATTACK, tier)));
            candidates.add(new FlameLineCandidate("Speed", tier, FlameStatVector.of(EquipmentStat.SPEED, tier)));
            candidates.add(new FlameLineCandidate("Jump", tier, FlameStatVector.of(EquipmentStat.JUMP, tier)));
        }

        return candidates;
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
