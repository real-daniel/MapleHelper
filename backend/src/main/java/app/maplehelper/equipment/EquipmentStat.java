package app.maplehelper.equipment;

import java.util.Locale;
import java.util.Optional;

public enum EquipmentStat {
    STR("STR"),
    DEX("DEX"),
    INT("INT"),
    LUK("LUK"),
    ALL_STATS("All Stats"),
    MAX_HP("Max HP"),
    MAX_MP("Max MP"),
    ATTACK_POWER("Attack Power"),
    MAGIC_ATTACK("Magic Attack"),
    DEFENSE("Defense"),
    SPEED("Speed"),
    JUMP("Jump"),
    BOSS_DAMAGE("Boss Damage"),
    DAMAGE("Damage"),
    ENEMY_DEFENSE_IGNORED("Enemy Defense Ignored");

    private final String label;

    EquipmentStat(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    public static Optional<EquipmentStat> fromOcrName(String value) {
        String normalized = value.toLowerCase(Locale.ROOT)
                .replace('0', 'o')
                .replace('1', 'i')
                .replace('7', 't')
                .replaceAll("[^a-z]", "");

        Optional<EquipmentStat> exact = switch (normalized) {
            case "str" -> Optional.of(STR);
            case "dex" -> Optional.of(DEX);
            case "int" -> Optional.of(INT);
            case "luk" -> Optional.of(LUK);
            case "allstat", "allstats", "alstats" -> Optional.of(ALL_STATS);
            case "maxhp", "machp", "mach" -> Optional.of(MAX_HP);
            case "maxmp", "wax" -> Optional.of(MAX_MP);
            case "attackpower", "attpower" -> Optional.of(ATTACK_POWER);
            case "magicatt", "magicattack" -> Optional.of(MAGIC_ATTACK);
            case "defense" -> Optional.of(DEFENSE);
            case "speed" -> Optional.of(SPEED);
            case "jump" -> Optional.of(JUMP);
            case "bossdamage" -> Optional.of(BOSS_DAMAGE);
            case "damage" -> Optional.of(DAMAGE);
            case "enemydefignored", "enemydefenseignored" -> Optional.of(ENEMY_DEFENSE_IGNORED);
            default -> Optional.empty();
        };
        if (exact.isPresent() || normalized.length() < 3) {
            return exact;
        }

        EquipmentStat best = null;
        int bestDistance = Integer.MAX_VALUE;
        for (EquipmentStat stat : values()) {
            String candidate = stat.label.toLowerCase(Locale.ROOT).replaceAll("[^a-z]", "");
            int distance = editDistance(normalized, candidate);
            int allowedDistance = candidate.length() <= 4 ? 1 : Math.max(2, candidate.length() / 5);
            if (distance <= allowedDistance && distance < bestDistance) {
                best = stat;
                bestDistance = distance;
            }
        }

        return Optional.ofNullable(best);
    }

    private static int editDistance(String left, String right) {
        int[] previous = new int[right.length() + 1];
        for (int index = 0; index <= right.length(); index++) {
            previous[index] = index;
        }

        for (int leftIndex = 1; leftIndex <= left.length(); leftIndex++) {
            int[] current = new int[right.length() + 1];
            current[0] = leftIndex;
            for (int rightIndex = 1; rightIndex <= right.length(); rightIndex++) {
                int substitution = previous[rightIndex - 1]
                        + (left.charAt(leftIndex - 1) == right.charAt(rightIndex - 1) ? 0 : 1);
                current[rightIndex] = Math.min(
                        Math.min(current[rightIndex - 1] + 1, previous[rightIndex] + 1),
                        substitution);
            }
            previous = current;
        }

        return previous[right.length()];
    }
}
