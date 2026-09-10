package app.maplehelper.equipment;

record FlameLineCandidate(
        String name,
        int tier,
        FlameStatVector contribution
) {

    String typeKey() {
        return name;
    }

    String display() {
        String suffix = contribution.values().containsKey(EquipmentStat.ALL_STATS)
                || contribution.values().containsKey(EquipmentStat.BOSS_DAMAGE)
                || contribution.values().containsKey(EquipmentStat.DAMAGE)
                ? "%"
                : "";
        int value = contribution.values().values().stream().findFirst().orElse(0);
        return name + ": +" + value + suffix + " (Tier " + tier + ")";
    }

    int displayPriority() {
        if (name.equals("All Stats")) {
            return 0;
        }

        if (!name.contains("&") && (name.equals("STR") || name.equals("DEX") || name.equals("INT") || name.equals("LUK"))) {
            return 1;
        }

        if (name.contains("&")) {
            return 2;
        }

        if (name.equals("Attack Power")) {
            return 3;
        }

        if (name.equals("Magic Attack")) {
            return 4;
        }

        if (name.equals("Boss Damage")) {
            return 5;
        }

        if (name.equals("Damage")) {
            return 6;
        }

        if (name.equals("Speed")) {
            return 7;
        }

        if (name.equals("Jump")) {
            return 8;
        }

        return 10;
    }
}
