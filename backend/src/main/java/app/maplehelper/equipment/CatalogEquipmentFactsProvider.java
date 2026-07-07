package app.maplehelper.equipment;

import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Component
public class CatalogEquipmentFactsProvider {

    private static final List<CatalogEquipmentFacts> FACTS = List.of(
            new CatalogEquipmentFacts(
                    "Eternal Knight Pants",
                    EquipmentSlot.BOTTOM,
                    250,
                    StarForceProfile.NORMAL,
                    Map.of(
                            EquipmentStat.STR, 50,
                            EquipmentStat.DEX, 50,
                            EquipmentStat.INT, 0,
                            EquipmentStat.LUK, 0,
                            EquipmentStat.ALL_STATS, 0,
                            EquipmentStat.MAX_HP, 0,
                            EquipmentStat.ATTACK_POWER, 6,
                            EquipmentStat.MAGIC_ATTACK, 0,
                            EquipmentStat.DEFENSE, 325)),
            new CatalogEquipmentFacts(
                    "Eternal Knight Shoes",
                    EquipmentSlot.SHOES,
                    250,
                    StarForceProfile.NORMAL,
                    Map.of(
                            EquipmentStat.STR, 55,
                            EquipmentStat.DEX, 55,
                            EquipmentStat.INT, 0,
                            EquipmentStat.LUK, 0,
                            EquipmentStat.ALL_STATS, 0,
                            EquipmentStat.ATTACK_POWER, 12,
                            EquipmentStat.MAGIC_ATTACK, 0,
                            EquipmentStat.DEFENSE, 325,
                            EquipmentStat.SPEED, 10,
                            EquipmentStat.JUMP, 7)),
            new CatalogEquipmentFacts(
                    "Sweetwater Tattoo",
                    EquipmentSlot.FACE,
                    180,
                    StarForceProfile.NORMAL,
                    Map.of(
                            EquipmentStat.STR, 5,
                            EquipmentStat.DEX, 5,
                            EquipmentStat.INT, 5,
                            EquipmentStat.LUK, 5,
                            EquipmentStat.ATTACK_POWER, 0,
                            EquipmentStat.MAGIC_ATTACK, 0,
                            EquipmentStat.DEFENSE, 108))
    );

    public Optional<CatalogEquipmentFacts> findBest(String name, EquipmentSlot slot, Integer levelRequirement) {
        if (name == null || name.isBlank()) {
            return Optional.empty();
        }

        String normalizedName = normalize(name);
        return FACTS.stream()
                .filter(facts -> slot == null || facts.slot() == slot)
                .filter(facts -> levelRequirement == null
                        || facts.levelRequirement() == null
                        || Math.abs(facts.levelRequirement() - levelRequirement) <= 10)
                .map(facts -> new ScoredFacts(facts, score(normalizedName, facts)))
                .filter(scored -> scored.score() > 0)
                .max(Comparator.comparingInt(ScoredFacts::score))
                .map(ScoredFacts::facts);
    }

    private int score(String normalizedName, CatalogEquipmentFacts facts) {
        String normalizedCatalogName = normalize(facts.name());
        if (normalizedName.equals(normalizedCatalogName)) {
            return 100;
        }

        if (normalizedName.contains(normalizedCatalogName) || normalizedCatalogName.contains(normalizedName)) {
            return 80;
        }

        int score = 0;
        for (String token : normalizedCatalogName.split(" ")) {
            if (token.length() >= 4 && normalizedName.contains(token)) {
                score += 10;
            }
        }

        return score;
    }

    private String normalize(String value) {
        return value.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .trim();
    }

    private record ScoredFacts(CatalogEquipmentFacts facts, int score) {
    }
}
