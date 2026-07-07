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
        String suffix = contribution.values().containsKey(EquipmentStat.ALL_STATS) ? "%" : "";
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

        if (name.equals("Speed")) {
            return 5;
        }

        if (name.equals("Jump")) {
            return 6;
        }

        return 10;
    }
}
