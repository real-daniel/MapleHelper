package app.maplehelper.equipment;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class EquipmentStatLineParser {

    private static final Pattern STAT_LINE_PATTERN = Pattern.compile(
            "(?i)^\\s*([A-Za-z ]+)\\s*[:+ ]*([+\\-#]?\\s*\\d{1,5})\\s*(%)?.*");

    public List<ParsedEquipmentStatLine> parse(String statLines) {
        if (statLines == null || statLines.isBlank()) {
            return List.of();
        }

        List<ParsedEquipmentStatLine> parsed = new ArrayList<>();
        for (String line : statLines.lines().toList()) {
            parseLine(line).ifPresent(parsed::add);
        }

        return parsed;
    }

    private Optional<ParsedEquipmentStatLine> parseLine(String line) {
        Matcher matcher = STAT_LINE_PATTERN.matcher(line.replace("#", "+"));
        if (!matcher.matches()) {
            return Optional.empty();
        }

        return EquipmentStat.fromOcrName(matcher.group(1))
                .map(stat -> new ParsedEquipmentStatLine(
                        stat,
                        Integer.parseInt(matcher.group(2).replaceAll("[^\\-\\d]", "")),
                        matcher.group(3) != null));
    }
}
