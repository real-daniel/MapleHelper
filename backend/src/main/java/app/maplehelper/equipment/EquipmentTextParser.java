package app.maplehelper.equipment;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class EquipmentTextParser {

    private static final Pattern LEVEL_PATTERN = Pattern.compile("(?i)required\\s*level\\s*lv[\\.,]?\\s*(\\d{1,3})");
    private static final Pattern POTENTIAL_TIER_PATTERN = Pattern.compile("(?i)(bonus\\s+)?potential\\s*:?\\s*(rare|epic|unique|legendary)");
    private static final Pattern STAT_LINE_PATTERN = Pattern.compile(
            "(?i)^(str|dex|int|luk|all\\s*stats?|max\\s*hp|max\\s*mp|attack\\s*power|magic\\s*att|defense|speed|jump|boss\\s*damage|enemy\\s*def\\s*ignored)\\b.*");

    public ParsedEquipmentText parse(String rawText, Integer starForce) {
        List<String> lines = rawText == null ? List.of() : rawText.lines()
                .map(this::normalizeLine)
                .filter(line -> !line.isBlank())
                .toList();

        EquipmentSlot slot = findSlot(lines);
        String name = findName(lines);
        Integer levelRequirement = findLevelRequirement(lines);

        List<String> statLines = new ArrayList<>();
        List<String> potentialLines = new ArrayList<>();
        List<String> bonusPotentialLines = new ArrayList<>();
        String potentialTier = "";
        String bonusPotentialTier = "";
        boolean inPotential = false;
        boolean inBonusPotential = false;

        for (String line : lines) {
            Matcher potentialMatcher = POTENTIAL_TIER_PATTERN.matcher(line);
            if (potentialMatcher.find()) {
                String tier = capitalize(potentialMatcher.group(2));
                if (potentialMatcher.group(1) == null) {
                    potentialTier = tier;
                    inPotential = true;
                    inBonusPotential = false;
                } else {
                    bonusPotentialTier = tier;
                    inPotential = false;
                    inBonusPotential = true;
                }
                continue;
            }

            if (line.toLowerCase(Locale.ROOT).startsWith("exceptional")
                    || line.toLowerCase(Locale.ROOT).contains("enhancement details")) {
                inPotential = false;
                inBonusPotential = false;
            }

            if (isPotentialLine(line)) {
                if (inBonusPotential) {
                    bonusPotentialLines.add(line);
                } else if (inPotential || !potentialTier.isBlank()) {
                    potentialLines.add(line);
                }
                continue;
            }

            if (STAT_LINE_PATTERN.matcher(line).matches()) {
                statLines.add(line);
            }
        }

        return new ParsedEquipmentText(
                slot,
                name,
                levelRequirement,
                starForce,
                String.join(System.lineSeparator(), statLines),
                potentialTier,
                String.join(System.lineSeparator(), potentialLines),
                bonusPotentialTier,
                String.join(System.lineSeparator(), bonusPotentialLines));
    }

    private String normalizeLine(String value) {
        return value
                .replace('|', ' ')
                .replace('®', ' ')
                .replace('•', ' ')
                .replace('=',' ')
                .replaceAll("\\s+", " ")
                .replaceAll("(?i)^BBR\\b", "STR")
                .replaceAll("(?i)^Alstats\\b", "All Stats")
                .replaceAll("(?i)^Allstats\\b", "All Stats")
                .replaceAll("(?i)^Aitack\\s*Power\\b", "Attack Power")
                .replaceAll("(?i)^AttackPower\\b", "Attack Power")
                .replaceAll("(?i)^STR['/:]?\\s*", "STR ")
                .replaceAll("(?i)^DEX['/:]?\\s*", "DEX ")
                .replaceAll("(?i)^INT['/:]?\\s*", "INT ")
                .replaceAll("(?i)^LUK['/:]?\\s*", "LUK ")
                .trim();
    }

    private EquipmentSlot findSlot(List<String> lines) {
        for (String line : lines) {
            String lower = line.toLowerCase(Locale.ROOT);
            if (lower.contains("eari") || lower.contains("earring")) return EquipmentSlot.EARRINGS;
            if (lower.contains("bottom") || lower.contains("pants")) return EquipmentSlot.BOTTOM;
            if (lower.contains("shoes")) return EquipmentSlot.SHOES;
            if (lower.contains("gloves")) return EquipmentSlot.GLOVES;
            if (lower.contains("cape")) return EquipmentSlot.CAPE;
            if (lower.contains("hat")) return EquipmentSlot.HAT;
            if (lower.contains("armor") && lower.contains("top")) return EquipmentSlot.TOP;
            if (lower.contains("weapon")) return EquipmentSlot.WEAPON;
            if (lower.contains("secondary")) return EquipmentSlot.SECONDARY;
            if (lower.contains("emblem")) return EquipmentSlot.EMBLEM;
            if (lower.contains("belt")) return EquipmentSlot.BELT;
            if (lower.contains("shoulder")) return EquipmentSlot.SHOULDER;
            if (lower.contains("face")) return EquipmentSlot.FACE;
            if (lower.contains("eye")) return EquipmentSlot.EYE;
            if (lower.contains("pendant")) return EquipmentSlot.PENDANT_1;
            if (lower.contains("ring")) return EquipmentSlot.RING_1;
            if (lower.contains("badge")) return EquipmentSlot.BADGE;
            if (lower.contains("medal")) return EquipmentSlot.MEDAL;
            if (lower.contains("heart")) return EquipmentSlot.HEART;
            if (lower.contains("android")) return EquipmentSlot.ANDROID;
            if (lower.contains("pocket")) return EquipmentSlot.POCKET;
        }

        return EquipmentSlot.WEAPON;
    }

    private String findName(List<String> lines) {
        for (int index = 0; index < lines.size(); index++) {
            String line = lines.get(index);
            if (line.toLowerCase(Locale.ROOT).contains("untradable") && index > 0) {
                return cleanName(lines.get(index - 1));
            }
        }

        return lines.stream()
                .filter(line -> line.matches(".*[A-Za-z]{3,}.*"))
                .filter(line -> !isUiNoise(line))
                .findFirst()
                .map(this::cleanName)
                .orElse("");
    }

    private String cleanName(String line) {
        return line.replaceAll("^[^A-Za-z]+", "").trim();
    }

    private boolean isUiNoise(String line) {
        String lower = line.toLowerCase(Locale.ROOT);
        return lower.contains("currently equipped")
                || lower.contains("combat power")
                || lower.contains("required")
                || lower.contains("set effect")
                || lower.contains("potential")
                || lower.contains("interact")
                || lower.contains("enhancement");
    }

    private Integer findLevelRequirement(List<String> lines) {
        for (String line : lines) {
            Matcher matcher = LEVEL_PATTERN.matcher(line);
            if (matcher.find()) {
                return Integer.parseInt(matcher.group(1));
            }
        }

        return null;
    }

    private boolean isPotentialLine(String line) {
        return line.matches("(?i)^(str|dex|int|luk|all\\s*stats?|boss\\s*damage|damage|critical\\s*damage|attack\\s*power|magic\\s*att|item\\s*drop|meso).*[-+]?\\d+%?.*");
    }

    private String capitalize(String value) {
        String lower = value.toLowerCase(Locale.ROOT);
        return lower.substring(0, 1).toUpperCase(Locale.ROOT) + lower.substring(1);
    }
}
