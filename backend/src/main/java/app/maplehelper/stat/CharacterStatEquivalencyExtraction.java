package app.maplehelper.stat;

import java.util.List;

public record CharacterStatEquivalencyExtraction(
        List<CharacterStatEquivalency> equivalencies,
        String lines,
        String rawText,
        String extractionStatus,
        String extractionNotes
) {
}
