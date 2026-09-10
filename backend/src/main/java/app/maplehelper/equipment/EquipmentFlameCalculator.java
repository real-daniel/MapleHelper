package app.maplehelper.equipment;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class EquipmentFlameCalculator {

    private static final int OCR_SMALL_DELTA_TOLERANCE = 3;

    private final CatalogEquipmentFactsProvider factsProvider;
    private final EquipmentStatLineParser statLineParser;
    private final StarForceCalculator starForceCalculator;
    private final FlameLineSolver flameLineSolver;

    public EquipmentFlameCalculator(
            CatalogEquipmentFactsProvider factsProvider,
            EquipmentStatLineParser statLineParser,
            StarForceCalculator starForceCalculator,
            FlameLineSolver flameLineSolver) {
        this.factsProvider = factsProvider;
        this.statLineParser = statLineParser;
        this.starForceCalculator = starForceCalculator;
        this.flameLineSolver = flameLineSolver;
    }

    public String deriveFlameStats(ParsedEquipmentText parsed) {
        if (parsed.starForce() == null) {
            return "";
        }

        if (parsed.slot() == EquipmentSlot.WEAPON && parsed.flameStats() != null && !parsed.flameStats().isBlank()) {
            return parsed.flameStats().trim();
        }

        return factsProvider.findBest(parsed.name(), parsed.slot(), parsed.levelRequirement())
                .map(facts -> formatDisplayedFlames(displayedFlames(parsed, facts)))
                .orElse("");
    }

    public String deriveFlameScoreLines(ParsedEquipmentText parsed) {
        if (parsed.starForce() == null) {
            return "";
        }

        return factsProvider.findBest(parsed.name(), parsed.slot(), parsed.levelRequirement())
                .map(facts -> flameLineSolver.solve(facts, flameScoreSource(parsed, facts)))
                .orElse("");
    }

    private Map<EquipmentStat, Integer> flameScoreSource(ParsedEquipmentText parsed, CatalogEquipmentFacts facts) {
        if (facts.slot() == EquipmentSlot.WEAPON && parsed.flameStats() != null && !parsed.flameStats().isBlank()) {
            Map<EquipmentStat, Integer> parsedFlames = new EnumMap<>(EquipmentStat.class);
            for (ParsedEquipmentStatLine statLine : statLineParser.parse(parsed.flameStats())) {
                parsedFlames.put(statLine.stat(), statLine.total());
            }
            return parsedFlames;
        }

        return displayedFlames(parsed, facts);
    }

    private Map<EquipmentStat, Integer> displayedFlames(ParsedEquipmentText parsed, CatalogEquipmentFacts facts) {
        Map<EquipmentStat, Integer> displayedFlames = new EnumMap<>(EquipmentStat.class);
        for (ParsedEquipmentStatLine statLine : statLineParser.parse(parsed.statLines())) {
            if (statLine.stat() == EquipmentStat.DEFENSE) {
                continue;
            }

            int base = facts.baseStats().getOrDefault(statLine.stat(), 0);
            int starForce = starForceCalculator.contribution(facts, statLine.stat(), parsed.starForce());
            int flame = statLine.total() - base - starForce;
            if (isDefensiveStat(statLine.stat()) && Math.abs(flame) <= OCR_SMALL_DELTA_TOLERANCE) {
                flame = 0;
            }

            if (flame > 0) {
                displayedFlames.put(statLine.stat(), flame);
            }
        }

        return displayedFlames;
    }

    private String formatDisplayedFlames(Map<EquipmentStat, Integer> displayedFlames) {
        List<String> flameLines = new ArrayList<>();
        for (Map.Entry<EquipmentStat, Integer> entry : displayedFlames.entrySet()) {
            String suffix = isPercentFlame(entry.getKey()) ? "%" : "";
            flameLines.add(entry.getKey().label() + ": +" + entry.getValue() + suffix);
        }

        return String.join(System.lineSeparator(), flameLines);
    }

    private boolean isPercentFlame(EquipmentStat stat) {
        return stat == EquipmentStat.ALL_STATS
                || stat == EquipmentStat.BOSS_DAMAGE
                || stat == EquipmentStat.DAMAGE;
    }

    private boolean isDefensiveStat(EquipmentStat stat) {
        return stat == EquipmentStat.MAX_HP
                || stat == EquipmentStat.MAX_MP
                || stat == EquipmentStat.DEFENSE;
    }
}
