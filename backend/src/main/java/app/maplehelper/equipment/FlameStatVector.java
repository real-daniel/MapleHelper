package app.maplehelper.equipment;

import java.util.EnumMap;
import java.util.Map;

record FlameStatVector(Map<EquipmentStat, Integer> values) {

    static FlameStatVector empty() {
        return new FlameStatVector(new EnumMap<>(EquipmentStat.class));
    }

    int get(EquipmentStat stat) {
        return values.getOrDefault(stat, 0);
    }

    FlameStatVector plus(FlameStatVector other) {
        Map<EquipmentStat, Integer> combined = new EnumMap<>(EquipmentStat.class);
        combined.putAll(values);
        for (Map.Entry<EquipmentStat, Integer> entry : other.values().entrySet()) {
            combined.merge(entry.getKey(), entry.getValue(), Integer::sum);
        }

        return new FlameStatVector(combined);
    }

    boolean contributesToAny(Map<EquipmentStat, Integer> target) {
        return values.keySet().stream().anyMatch(target::containsKey);
    }

    static FlameStatVector of(EquipmentStat stat, int value) {
        Map<EquipmentStat, Integer> values = new EnumMap<>(EquipmentStat.class);
        values.put(stat, value);
        return new FlameStatVector(values);
    }

    static FlameStatVector of(EquipmentStat first, EquipmentStat second, int value) {
        Map<EquipmentStat, Integer> values = new EnumMap<>(EquipmentStat.class);
        values.put(first, value);
        values.put(second, value);
        return new FlameStatVector(values);
    }
}
