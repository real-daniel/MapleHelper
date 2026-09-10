package app.maplehelper.equipment;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

public final class SkillRingDetector {

    private static final List<String> SKILL_RING_NAMES = List.of(
            "ring of restraint",
            "continuous ring",
            "weapon jump s ring",
            "weapon jump i ring",
            "weapon jump l ring",
            "weapon jump d ring",
            "risk taker ring",
            "totalling ring",
            "critical damage ring",
            "ultimatum ring",
            "crisis hm ring",
            "cleansing ring",
            "overdrive ring",
            "level jump s ring",
            "level jump d ring",
            "level jump i ring",
            "level jump l ring",
            "health cut ring",
            "critical defense ring",
            "limit ring",
            "durability ring",
            "clean defense ring",
            "berserker ring",
            "mana cut ring",
            "crisis h ring",
            "crisis m ring",
            "critical shift ring",
            "stance shift ring",
            "clean stance ring",
            "swift ring",
            "reflective ring",
            "tower boost ring",
            "modestly grand ribbit ring",
            "rather grand ribbit ring",
            "quite grand ribbit ring",
            "very grand ribbit ring",
            "modestly sturdy krrr ring",
            "rather sturdy krrr ring",
            "quite sturdy krrr ring",
            "very sturdy krrr ring",
            "modestly fatal rawr ring",
            "rather fatal rawr ring",
            "quite fatal rawr ring",
            "very fatal rawr ring",
            "modestly grand pew pew ring",
            "rather grand pew pew ring",
            "quite grand pew pew ring",
            "very grand pew pew ring");

    private SkillRingDetector() {
    }

    public static boolean isSkillRing(String name) {
        if (name == null || name.isBlank()) {
            return false;
        }

        String normalized = normalize(name);
        if (normalized.contains("special skill ring")) {
            return true;
        }

        if (SKILL_RING_NAMES.stream().anyMatch(normalized::contains)) {
            return true;
        }

        return normalized.matches(".*\\bweapon jump [sild] ring\\b.*")
                || normalized.matches(".*\\blevel jump [sild] ring\\b.*")
                || normalized.matches(".*\\bcrisis (hm|h|m) ring\\b.*");
    }

    public static boolean isSkillRingText(String text) {
        return isSkillRing(text);
    }

    public static Optional<String> findSkillRingName(String text) {
        if (text == null || text.isBlank()) {
            return Optional.empty();
        }

        String normalized = normalize(text);
        return SKILL_RING_NAMES.stream()
                .filter(normalized::contains)
                .findFirst()
                .map(SkillRingDetector::title);
    }

    private static String normalize(String value) {
        return value.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static String title(String value) {
        String[] words = value.split(" ");
        StringBuilder builder = new StringBuilder();
        for (String word : words) {
            if (!builder.isEmpty()) {
                builder.append(' ');
            }
            if (word.equals("of") || word.equals("and")) {
                builder.append(word);
            } else if (word.length() == 1) {
                builder.append(word.toUpperCase(Locale.ROOT));
            } else {
                builder.append(word.substring(0, 1).toUpperCase(Locale.ROOT))
                        .append(word.substring(1));
            }
        }
        return builder.toString();
    }
}
