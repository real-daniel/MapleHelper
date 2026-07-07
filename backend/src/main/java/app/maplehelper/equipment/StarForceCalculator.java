package app.maplehelper.equipment;

import org.springframework.stereotype.Component;

@Component
public class StarForceCalculator {

    public int contribution(CatalogEquipmentFacts item, EquipmentStat stat, int starForce) {
        if (item.starForceProfile() == StarForceProfile.NONE || starForce <= 0) {
            return 0;
        }

        if (item.levelRequirement() == null) {
            return 0;
        }

        if (item.levelRequirement() >= 240 && starForce >= 22) {
            return level250TwentyTwoStarContribution(stat);
        }

        if (item.levelRequirement() >= 160 && item.levelRequirement() <= 190 && starForce >= 22) {
            return level180TwentyTwoStarContribution(stat);
        }

        return 0;
    }

    private int level250TwentyTwoStarContribution(EquipmentStat stat) {
        return switch (stat) {
            case STR, DEX -> 159;
            case MAX_HP -> 255;
            case ATTACK_POWER, MAGIC_ATTACK -> 168;
            case DEFENSE -> 745;
            default -> 0;
        };
    }

    private int level180TwentyTwoStarContribution(EquipmentStat stat) {
        return switch (stat) {
            case STR, DEX, INT, LUK -> 131;
            case ATTACK_POWER, MAGIC_ATTACK -> 92;
            case DEFENSE -> 24;
            default -> 0;
        };
    }
}
