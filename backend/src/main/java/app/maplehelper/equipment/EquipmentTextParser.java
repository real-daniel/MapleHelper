package app.maplehelper.equipment;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class EquipmentTextParser {

    private static final Pattern POSSIBLE_STAT_LINE_PATTERN = Pattern.compile(
            "^\\s*([A-Za-z0-9 .]{2,28}?)\\s*:?\\s+([+\\-#]\\s*\\d{1,5})\\s*(%?)\\s*(?:\\([^)]*\\))?.*");
    private static final Pattern LEVEL_PATTERN = Pattern.compile("(?i)required\\s*level\\s*lv[\\.,]?\\s*(\\d{1,3})");
    private static final Pattern POTENTIAL_TIER_PATTERN = Pattern.compile("(?i)(bonus\\s+)?potential\\s*:?\\s*(rare|epic|unique|legendary)");
    private static final Pattern STAT_LINE_PATTERN = Pattern.compile(
            "(?i)^(str|dex|int|luk|all\\s*stats?|max\\s*hp|max\\s*mp|attack\\s*power|magic\\s*att|defense|speed|jump|boss\\s*damage|enemy\\s*def\\s*ignored)\\b.*");
    private static final Pattern EQUIPMENT_STAT_COMPONENT_PATTERN = Pattern.compile(
            "(?i)^(str|dex|int|luk|all\\s*stats?|max\\s*hp|max\\s*mp|attack\\s*power|magic\\s*att|defense|speed|jump|boss\\s*damage|damage)\\b\\s*[:+ ]*([+\\-]?\\s*\\d{1,5}\\s*%?)\\s*\\(([^)]*)\\).*");
    private static final Pattern COMPONENT_VALUE_PATTERN = Pattern.compile("([+\\-]?\\s*\\d{1,5}\\s*%?)");
    private static final Pattern POTENTIAL_LINE_PATTERN = Pattern.compile(
            "(?i).*?\\b(str|dex|int|luk|all\\s*stats?|boss\\s*damage|damage|critical\\s*damage|crit(?:ical)?\\s*dmg|attack\\s*power|att(?:ack)?|magic\\s*att(?:ack)?|m\\.\\s*att(?:ack)?|item\\s*drop(?:\\s*rate)?|drop\\s*rate|meso(?:s)?(?:\\s*obtained)?|enemy\\s*def(?:ense)?\\s*ignored|ignore\\s*enemy\\s*def(?:ense)?|ied)\\b\\s*[':;/| ]*([+\\-]?\\s*\\d{1,3}\\s*%?).*");

    private final CatalogEquipmentFactsProvider factsProvider;

    public EquipmentTextParser(CatalogEquipmentFactsProvider factsProvider) {
        this.factsProvider = factsProvider;
    }

    public ParsedEquipmentText parse(String rawText, Integer starForce) {
        List<String> lines = rawText == null ? List.of() : rawText.lines()
                .map(this::normalizeLine)
                .filter(line -> !line.isBlank())
                .toList();

        EquipmentSlot detectedSlot = findSlot(lines);
        String name = findName(lines);
        Integer levelRequirement = correctLevelRequirement(name, findLevelRequirement(lines));
        Optional<CatalogEquipmentFacts> catalogMatch = factsProvider.findBest(name, detectedSlot, levelRequirement);
        EquipmentSlot slot = catalogMatch.map(CatalogEquipmentFacts::slot).orElse(detectedSlot);
        name = catalogMatch.map(CatalogEquipmentFacts::name).orElse(name);
        if (levelRequirement == null && catalogMatch.isPresent()) {
            levelRequirement = catalogMatch.get().levelRequirement();
        }

        List<String> statLines = new ArrayList<>();
        List<String> flameStats = new ArrayList<>();
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

            if (endsPotentialSection(line)) {
                inPotential = false;
                inBonusPotential = false;
            }

            Optional<String> potentialLine = cleanPotentialLine(line);
            if (potentialLine.isPresent() && (inBonusPotential || inPotential)) {
                if (inBonusPotential) {
                    bonusPotentialLines.add(potentialLine.get());
                } else {
                    potentialLines.add(potentialLine.get());
                }
                continue;
            }

            Optional<String> flameLine = cleanFlameLine(line, starForce);
            if (flameLine.isPresent()) {
                flameStats.add(flameLine.get());
            }

            canonicalizeStatLine(line).ifPresent(statLines::add);
        }

        return new ParsedEquipmentText(
                slot,
                name,
                levelRequirement,
                starForce,
                String.join(System.lineSeparator(), statLines),
                String.join(System.lineSeparator(), flameStats),
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
                .replaceAll("(?i)^BossDamage\\b", "Boss Damage")
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
            if (lower.contains("pendant")) return EquipmentSlot.PENDANT;
            if (lower.contains("ring")) return EquipmentSlot.RING;
            if (lower.contains("badge")) return EquipmentSlot.BADGE;
            if (lower.contains("medal")) return EquipmentSlot.MEDAL;
            if (lower.contains("heart")) return EquipmentSlot.HEART;
            if (lower.contains("android")) return EquipmentSlot.ANDROID;
            if (lower.contains("pocket")) return EquipmentSlot.POCKET;
            if (lower.contains("totem")) return EquipmentSlot.TOTEM;
        }

        return null;
    }

    private Optional<String> canonicalizeStatLine(String line) {
        Matcher matcher = POSSIBLE_STAT_LINE_PATTERN.matcher(line);
        if (!matcher.matches()) {
            return Optional.empty();
        }

        return EquipmentStat.fromOcrName(matcher.group(1))
                .map(stat -> stat.label() + line.substring(matcher.end(1)));
    }

    private String findName(List<String> lines) {
        Optional<String> skillRingName = SkillRingDetector.findSkillRingName(String.join(System.lineSeparator(), lines));
        if (skillRingName.isPresent()) {
            return skillRingName.get();
        }

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

    private boolean endsPotentialSection(String line) {
        String lower = line.toLowerCase(Locale.ROOT);
        return lower.startsWith("exceptional")
                || lower.contains("enhancement details")
                || lower.contains("soul");
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

    private Integer correctLevelRequirement(String name, Integer levelRequirement) {
        String lower = name.toLowerCase(Locale.ROOT);
        if (lower.contains("eternal") && (levelRequirement == null || (levelRequirement >= 240 && levelRequirement <= 260))) {
            return 250;
        }

        return levelRequirement;
    }

    private Optional<String> cleanPotentialLine(String line) {
        Matcher matcher = POTENTIAL_LINE_PATTERN.matcher(line);
        if (!matcher.matches()) {
            return Optional.empty();
        }

        String stat = normalizePotentialStat(matcher.group(1));
        String value = matcher.group(2).replaceAll("\\s+", "");
        if (!value.startsWith("+") && !value.startsWith("-")) {
            value = "+" + value;
        }

        return Optional.of(stat + ": " + value);
    }

    private Optional<String> cleanFlameLine(String line, Integer starForce) {
        if (!STAT_LINE_PATTERN.matcher(line).matches()) {
            return Optional.empty();
        }

        Matcher matcher = EQUIPMENT_STAT_COMPONENT_PATTERN.matcher(line);
        if (!matcher.matches()) {
            return Optional.empty();
        }

        String stat = normalizeEquipmentStat(matcher.group(1));
        String total = normalizeNumber(matcher.group(2));
        List<String> components = componentValues(matcher.group(3));
        if (components.isEmpty()) {
            return Optional.empty();
        }

        String flameValue = inferFlameValue(stat, total, components, starForce);
        if (flameValue == null || isZero(flameValue)) {
            return Optional.empty();
        }

        return Optional.of(stat + ": " + flameValue);
    }

    private List<String> componentValues(String value) {
        List<String> values = new ArrayList<>();
        Matcher matcher = COMPONENT_VALUE_PATTERN.matcher(value);
        while (matcher.find()) {
            values.add(normalizeNumber(matcher.group(1)));
        }

        return values;
    }

    private String inferFlameValue(String stat, String total, List<String> components, Integer starForce) {
        if (components.size() >= 3) {
            return components.get(components.size() - 1);
        }

        if (components.size() == 1 && stripPercent(total).equals(stripPercent(components.getFirst()))) {
            return components.getFirst();
        }

        if (components.size() == 2 && starForce != null && starForce <= 0) {
            return components.get(1);
        }

        return null;
    }

    private String normalizeEquipmentStat(String value) {
        String normalized = value.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
        return switch (normalized) {
            case "str" -> "STR";
            case "dex" -> "DEX";
            case "int" -> "INT";
            case "luk" -> "LUK";
            case "all stat", "all stats" -> "All Stats";
            case "max hp" -> "Max HP";
            case "max mp" -> "Max MP";
            case "attack power" -> "Attack Power";
            case "magic att" -> "Magic Attack";
            case "defense" -> "Defense";
            case "speed" -> "Speed";
            case "jump" -> "Jump";
            case "boss damage" -> "Boss Damage";
            case "damage" -> "Damage";
            default -> capitalize(normalized);
        };
    }

    private String normalizeNumber(String value) {
        String normalized = value.replaceAll("\\s+", "");
        if (!normalized.startsWith("+") && !normalized.startsWith("-")) {
            normalized = "+" + normalized;
        }

        return normalized;
    }

    private boolean isZero(String value) {
        return stripPercent(value).replace("+", "").replace("-", "").matches("0+");
    }

    private String stripPercent(String value) {
        return value.replace("%", "");
    }

    private String normalizePotentialStat(String value) {
        String normalized = value.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
        return switch (normalized) {
            case "str" -> "STR";
            case "dex" -> "DEX";
            case "int" -> "INT";
            case "luk" -> "LUK";
            case "all stat", "all stats" -> "All Stats";
            case "boss damage" -> "Boss Damage";
            case "damage" -> "Damage";
            case "critical damage", "critical dmg", "crit dmg" -> "Critical Damage";
            case "attack power", "attack", "att" -> "Attack Power";
            case "magic att", "magic attack", "m. att", "m. attack" -> "Magic Attack";
            case "item drop", "item drop rate", "drop rate" -> "Item Drop Rate";
            case "meso", "mesos", "meso obtained", "mesos obtained" -> "Meso Obtained";
            case "enemy def ignored", "enemy defense ignored", "ignore enemy def", "ignore enemy defense", "ied" -> "Enemy Defense Ignored";
            default -> capitalize(normalized);
        };
    }

    private String capitalize(String value) {
        String lower = value.toLowerCase(Locale.ROOT);
        return lower.substring(0, 1).toUpperCase(Locale.ROOT) + lower.substring(1);
    }
}
