package app.maplehelper.character;

import java.net.URI;
import java.time.Instant;

public record ImportedCharacter(
        String name,
        String world,
        String job,
        Long weeklyRank,
        Long weeklyExperience,
        URI imageUrl,
        RankingRegion region,
        URI sourceUrl,
        Instant retrievedAt
) {
}

