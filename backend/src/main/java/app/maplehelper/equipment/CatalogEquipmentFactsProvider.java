package app.maplehelper.equipment;

import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Component
public class CatalogEquipmentFactsProvider {

    private static final List<CatalogEquipmentFacts> FACTS = List.of(
            fact("Kanna's Treasure", EquipmentSlot.RING_1, 140, standard(), allStats(5,
                    stat(EquipmentStat.MAX_HP, 200), stat(EquipmentStat.MAX_MP, 200),
                    stat(EquipmentStat.ATTACK_POWER, 1), stat(EquipmentStat.MAGIC_ATTACK, 1),
                    stat(EquipmentStat.DEFENSE, 150))),
            fact("Meister Ring", EquipmentSlot.RING_1, 140, standard(), allStats(5,
                    stat(EquipmentStat.MAX_HP, 200), stat(EquipmentStat.MAX_MP, 200),
                    stat(EquipmentStat.ATTACK_POWER, 1), stat(EquipmentStat.MAGIC_ATTACK, 1),
                    stat(EquipmentStat.DEFENSE, 150))),
            fact("Guardian Angel Ring", EquipmentSlot.RING_1, 160, standard(), allStats(5,
                    stat(EquipmentStat.MAX_HP, 200), stat(EquipmentStat.MAX_MP, 200),
                    stat(EquipmentStat.ATTACK_POWER, 2), stat(EquipmentStat.MAGIC_ATTACK, 2))),
            fact("Dawn Guardian Angel Ring", EquipmentSlot.RING_1, 160, standard(), allStats(5,
                    stat(EquipmentStat.MAX_HP, 200), stat(EquipmentStat.MAX_MP, 200),
                    stat(EquipmentStat.ATTACK_POWER, 2), stat(EquipmentStat.MAGIC_ATTACK, 2))),
            fact("Endless Terror", EquipmentSlot.RING_1, 200, standard(), allStats(5,
                    stat(EquipmentStat.MAX_HP, 250), stat(EquipmentStat.MAX_MP, 250),
                    stat(EquipmentStat.ATTACK_POWER, 4), stat(EquipmentStat.MAGIC_ATTACK, 4))),
            fact("Whisper of the Source", EquipmentSlot.RING_1, 250, standard(), allStats(10,
                    stat(EquipmentStat.MAX_HP, 500), stat(EquipmentStat.MAX_MP, 500),
                    stat(EquipmentStat.ATTACK_POWER, 5), stat(EquipmentStat.MAGIC_ATTACK, 5))),
            fact("Blissful Nightmare", EquipmentSlot.RING_1, 250, standard(), allStats(10,
                    stat(EquipmentStat.MAX_HP, 500), stat(EquipmentStat.MAX_MP, 500),
                    stat(EquipmentStat.ATTACK_POWER, 5), stat(EquipmentStat.MAGIC_ATTACK, 5))),

            fact("Dominator Pendant", EquipmentSlot.PENDANT_1, 140, standard(), allStats(20,
                    stat(EquipmentStat.ATTACK_POWER, 3), stat(EquipmentStat.MAGIC_ATTACK, 3),
                    stat(EquipmentStat.DEFENSE, 100))),
            fact("Daybreak Pendant", EquipmentSlot.PENDANT_1, 140, standard(), allStats(8,
                    stat(EquipmentStat.ATTACK_POWER, 2), stat(EquipmentStat.MAGIC_ATTACK, 2),
                    stat(EquipmentStat.DEFENSE, 100))),
            fact("Sweetwater Pendant", EquipmentSlot.PENDANT_1, 160, standard(), allStats(34,
                    stat(EquipmentStat.MAX_MP, 342), stat(EquipmentStat.DEFENSE, 330))),
            fact("Source of Suffering", EquipmentSlot.PENDANT_1, 160, standard(), allStats(10,
                    stat(EquipmentStat.ATTACK_POWER, 3), stat(EquipmentStat.MAGIC_ATTACK, 3),
                    stat(EquipmentStat.DEFENSE, 200))),
            fact("Oath of Death", EquipmentSlot.PENDANT_1, 250, standard(), allStats(15,
                    stat(EquipmentStat.ATTACK_POWER, 5), stat(EquipmentStat.MAGIC_ATTACK, 5),
                    stat(EquipmentStat.DEFENSE, 300))),

            fact("Black Bean Mark", EquipmentSlot.EYE, 135, standard(), allStats(7,
                    stat(EquipmentStat.ATTACK_POWER, 1), stat(EquipmentStat.MAGIC_ATTACK, 1),
                    stat(EquipmentStat.DEFENSE, 120))),
            fact("Papulatus Mark", EquipmentSlot.EYE, 145, standard(), allStats(8,
                    stat(EquipmentStat.ATTACK_POWER, 1), stat(EquipmentStat.MAGIC_ATTACK, 1),
                    stat(EquipmentStat.DEFENSE, 150))),
            fact("Sweetwater Monocle", EquipmentSlot.EYE, 160, standard(), allStats(10,
                    stat(EquipmentStat.MAX_HP, 240), stat(EquipmentStat.MAX_MP, 240),
                    stat(EquipmentStat.DEFENSE, 120))),
            fact("Magic Eyepatch", EquipmentSlot.EYE, 160, standard(), allStats(15,
                    stat(EquipmentStat.ATTACK_POWER, 3), stat(EquipmentStat.MAGIC_ATTACK, 3),
                    stat(EquipmentStat.DEFENSE, 300))),

            fact("Twilight Mark", EquipmentSlot.FACE, 140, standard(), allStats(5,
                    stat(EquipmentStat.ATTACK_POWER, 5), stat(EquipmentStat.MAGIC_ATTACK, 5),
                    stat(EquipmentStat.DEFENSE, 100))),
            fact("Sweetwater Tattoo", EquipmentSlot.FACE, 160, standard(), allStats(5,
                    stat(EquipmentStat.MAX_HP, 120), stat(EquipmentStat.MAX_MP, 120),
                    stat(EquipmentStat.DEFENSE, 38))),
            fact("Berserked", EquipmentSlot.FACE, 160, standard(), allStats(10,
                    stat(EquipmentStat.ATTACK_POWER, 10), stat(EquipmentStat.MAGIC_ATTACK, 10),
                    stat(EquipmentStat.DEFENSE, 200))),
            fact("Original Sin of Pride", EquipmentSlot.FACE, 250, standard(), allStats(15,
                    stat(EquipmentStat.ATTACK_POWER, 15), stat(EquipmentStat.MAGIC_ATTACK, 15),
                    stat(EquipmentStat.DEFENSE, 300))),

            fact("Dreamy Belt", EquipmentSlot.BELT, 200, standard(), allStats(50,
                    stat(EquipmentStat.MAX_HP, 150), stat(EquipmentStat.MAX_MP, 150),
                    stat(EquipmentStat.ATTACK_POWER, 6), stat(EquipmentStat.MAGIC_ATTACK, 6),
                    stat(EquipmentStat.DEFENSE, 150))),

            fact("Eternal Knight Pants", EquipmentSlot.BOTTOM, 250, standard(), stats(
                    stat(EquipmentStat.STR, 50), stat(EquipmentStat.DEX, 50), stat(EquipmentStat.INT, 0),
                    stat(EquipmentStat.LUK, 0), stat(EquipmentStat.ALL_STATS, 0),
                    stat(EquipmentStat.MAX_HP, 0), stat(EquipmentStat.ATTACK_POWER, 6),
                    stat(EquipmentStat.MAGIC_ATTACK, 0), stat(EquipmentStat.DEFENSE, 325))),
            fact("Eternal Knight Shoes", EquipmentSlot.SHOES, 250, standard(), stats(
                    stat(EquipmentStat.STR, 55), stat(EquipmentStat.DEX, 55), stat(EquipmentStat.INT, 0),
                    stat(EquipmentStat.LUK, 0), stat(EquipmentStat.ALL_STATS, 0),
                    stat(EquipmentStat.ATTACK_POWER, 12), stat(EquipmentStat.MAGIC_ATTACK, 0),
                    stat(EquipmentStat.DEFENSE, 325), stat(EquipmentStat.SPEED, 10),
                    stat(EquipmentStat.JUMP, 7)))
    );

    public Optional<CatalogEquipmentFacts> findBest(String name, EquipmentSlot slot, Integer levelRequirement) {
        if (name == null || name.isBlank()) {
            return Optional.empty();
        }

        String normalizedName = normalize(name);
        return FACTS.stream()
                .filter(facts -> slot == null || compatibleSlot(facts.slot(), slot))
                .filter(facts -> levelRequirement == null
                        || facts.levelRequirement() == null
                        || Math.abs(facts.levelRequirement() - levelRequirement) <= 10)
                .map(facts -> new ScoredFacts(facts, score(normalizedName, facts)))
                .filter(scored -> scored.score() > 0)
                .max(Comparator.comparingInt(ScoredFacts::score))
                .map(ScoredFacts::facts);
    }

    private boolean compatibleSlot(EquipmentSlot factSlot, EquipmentSlot parsedSlot) {
        if (factSlot == parsedSlot) {
            return true;
        }

        return isRing(factSlot) && isRing(parsedSlot)
                || isPendant(factSlot) && isPendant(parsedSlot);
    }

    private boolean isRing(EquipmentSlot slot) {
        return slot == EquipmentSlot.RING_1
                || slot == EquipmentSlot.RING_2
                || slot == EquipmentSlot.RING_3
                || slot == EquipmentSlot.RING_4;
    }

    private boolean isPendant(EquipmentSlot slot) {
        return slot == EquipmentSlot.PENDANT_1 || slot == EquipmentSlot.PENDANT_2;
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

    private static StarForceProfile standard() {
        return StarForceProfile.ARMOR_ACCESSORY;
    }

    private static CatalogEquipmentFacts fact(
            String name,
            EquipmentSlot slot,
            Integer levelRequirement,
            StarForceProfile starForceProfile,
            Map<EquipmentStat, Integer> baseStats) {
        return new CatalogEquipmentFacts(name, slot, levelRequirement, starForceProfile, baseStats);
    }

    private static StatValue stat(EquipmentStat stat, int value) {
        return new StatValue(stat, value);
    }

    private static Map<EquipmentStat, Integer> allStats(int value, StatValue... extras) {
        Map<EquipmentStat, Integer> stats = new EnumMap<>(EquipmentStat.class);
        stats.put(EquipmentStat.STR, value);
        stats.put(EquipmentStat.DEX, value);
        stats.put(EquipmentStat.INT, value);
        stats.put(EquipmentStat.LUK, value);
        stats.put(EquipmentStat.ALL_STATS, 0);
        for (StatValue extra : extras) {
            stats.put(extra.stat(), extra.value());
        }

        return Map.copyOf(stats);
    }

    private static Map<EquipmentStat, Integer> stats(StatValue... values) {
        Map<EquipmentStat, Integer> stats = new EnumMap<>(EquipmentStat.class);
        for (StatValue value : values) {
            stats.put(value.stat(), value.value());
        }

        return Map.copyOf(stats);
    }

    private record ScoredFacts(CatalogEquipmentFacts facts, int score) {
    }

    private record StatValue(EquipmentStat stat, int value) {
    }
}
