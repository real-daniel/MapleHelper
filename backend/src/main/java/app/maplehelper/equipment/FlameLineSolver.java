package app.maplehelper.equipment;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class FlameLineSolver {

    private static final int MAX_FLAME_LINES = 4;
    private static final Set<EquipmentStat> SOLVABLE_STATS = Set.of(
            EquipmentStat.STR,
            EquipmentStat.DEX,
            EquipmentStat.INT,
            EquipmentStat.LUK,
            EquipmentStat.ALL_STATS,
            EquipmentStat.ATTACK_POWER,
            EquipmentStat.MAGIC_ATTACK,
            EquipmentStat.SPEED,
            EquipmentStat.JUMP,
            EquipmentStat.BOSS_DAMAGE,
            EquipmentStat.DAMAGE
    );

    private final BonusStatTables bonusStatTables;

    public FlameLineSolver(BonusStatTables bonusStatTables) {
        this.bonusStatTables = bonusStatTables;
    }

    public String solve(CatalogEquipmentFacts facts, Map<EquipmentStat, Integer> displayedFlames) {
        Map<EquipmentStat, Integer> target = target(displayedFlames);
        if (target.isEmpty()) {
            return "";
        }

        List<FlameLineCandidate> candidates = bonusStatTables.candidates(facts).stream()
                .filter(candidate -> candidate.contribution().contributesToAny(target))
                .toList();
        if (candidates.isEmpty()) {
            return "";
        }

        SearchState state = new SearchState(target);
        search(candidates, target, 0, new ArrayList<>(), FlameStatVector.empty(), state);
        if (state.best().isEmpty()) {
            return "";
        }

        return state.best().stream()
                .sorted(Comparator.comparingInt(FlameLineCandidate::displayPriority)
                        .thenComparing(FlameLineCandidate::typeKey))
                .map(FlameLineCandidate::display)
                .collect(Collectors.joining(System.lineSeparator()));
    }

    private Map<EquipmentStat, Integer> target(Map<EquipmentStat, Integer> displayedFlames) {
        Map<EquipmentStat, Integer> target = new EnumMap<>(EquipmentStat.class);
        for (Map.Entry<EquipmentStat, Integer> entry : displayedFlames.entrySet()) {
            if (entry.getValue() > 0 && SOLVABLE_STATS.contains(entry.getKey())) {
                target.put(entry.getKey(), entry.getValue());
            }
        }

        return target;
    }

    private void search(
            List<FlameLineCandidate> candidates,
            Map<EquipmentStat, Integer> target,
            int start,
            List<FlameLineCandidate> selected,
            FlameStatVector sum,
            SearchState state) {
        state.consider(selected, sum);
        if (selected.size() == MAX_FLAME_LINES) {
            return;
        }

        for (int index = start; index < candidates.size(); index++) {
            FlameLineCandidate candidate = candidates.get(index);
            if (selected.stream().anyMatch(existing -> existing.typeKey().equals(candidate.typeKey()))) {
                continue;
            }

            FlameStatVector nextSum = sum.plus(candidate.contribution());
            if (overshootsTooFar(nextSum, target)) {
                continue;
            }

            selected.add(candidate);
            search(candidates, target, index + 1, selected, nextSum, state);
            selected.removeLast();
        }
    }

    private boolean overshootsTooFar(FlameStatVector sum, Map<EquipmentStat, Integer> target) {
        for (Map.Entry<EquipmentStat, Integer> entry : sum.values().entrySet()) {
            int targetValue = target.getOrDefault(entry.getKey(), 0);
            if (entry.getValue() > targetValue + 8) {
                return true;
            }
        }

        return false;
    }

    private static final class SearchState {
        private final Map<EquipmentStat, Integer> target;
        private List<FlameLineCandidate> best = List.of();
        private int bestScore = Integer.MAX_VALUE;

        private SearchState(Map<EquipmentStat, Integer> target) {
            this.target = target;
        }

        private void consider(List<FlameLineCandidate> selected, FlameStatVector sum) {
            if (selected.isEmpty()) {
                return;
            }

            int score = score(sum);
            if (score < bestScore || score == bestScore && selected.size() > best.size()) {
                bestScore = score;
                best = List.copyOf(selected);
            }
        }

        private int score(FlameStatVector sum) {
            int score = 0;
            for (EquipmentStat stat : SOLVABLE_STATS) {
                int delta = sum.get(stat) - target.getOrDefault(stat, 0);
                score += delta * delta;
            }

            return score;
        }

        private List<FlameLineCandidate> best() {
            return best;
        }
    }
}
