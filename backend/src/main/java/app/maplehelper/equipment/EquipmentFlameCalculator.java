package app.maplehelper.equipment;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class EquipmentFlameCalculator {

    private static final int OCR_SMALL_DELTA_TOLERANCE = 3;

    private final CatalogEquipmentFactsProvider factsProvider;
    private final EquipmentStatLineParser statLineParser;
    private final StarForceCalculator starForceCalculator;

    public EquipmentFlameCalculator(
            CatalogEquipmentFactsProvider factsProvider,
            EquipmentStatLineParser statLineParser,
            StarForceCalculator starForceCalculator) {
        this.factsProvider = factsProvider;
        this.statLineParser = statLineParser;
        this.starForceCalculator = starForceCalculator;
    }

    public String deriveFlameStats(ParsedEquipmentText parsed) {
        if (parsed.starForce() == null) {
            return "";
        }

        return factsProvider.findBest(parsed.name(), parsed.slot(), parsed.levelRequirement())
                .map(facts -> deriveFlameStats(parsed, facts))
                .orElse("");
    }

    private String deriveFlameStats(ParsedEquipmentText parsed, CatalogEquipmentFacts facts) {
        List<String> flameLines = new ArrayList<>();
        for (ParsedEquipmentStatLine statLine : statLineParser.parse(parsed.statLines())) {
            int base = facts.baseStats().getOrDefault(statLine.stat(), 0);
            int starForce = starForceCalculator.contribution(facts, statLine.stat(), parsed.starForce());
            int flame = statLine.total() - base - starForce;
            if (isDefensiveStat(statLine.stat()) && Math.abs(flame) <= OCR_SMALL_DELTA_TOLERANCE) {
                flame = 0;
            }

            if (flame > 0) {
                flameLines.add(statLine.stat().label() + ": +" + flame + (statLine.percent() ? "%" : ""));
            }
        }

        return String.join(System.lineSeparator(), flameLines);
    }

    private boolean isDefensiveStat(EquipmentStat stat) {
        return stat == EquipmentStat.MAX_HP
                || stat == EquipmentStat.MAX_MP
                || stat == EquipmentStat.DEFENSE;
    }
}
