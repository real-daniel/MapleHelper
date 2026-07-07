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
                .replaceAll("[^a-z]", "");

        return switch (normalized) {
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
            case "enemydefignored", "enemydefenseignored" -> Optional.of(ENEMY_DEFENSE_IGNORED);
            default -> Optional.empty();
        };
    }
}
