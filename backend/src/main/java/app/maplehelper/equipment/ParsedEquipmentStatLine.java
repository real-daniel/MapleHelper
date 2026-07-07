package app.maplehelper.equipment;

public record ParsedEquipmentStatLine(
        EquipmentStat stat,
        int total,
        boolean percent
) {
}
