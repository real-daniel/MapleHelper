package app.maplehelper.profile;

import app.maplehelper.character.RankingRegion;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;

@Table("character_profiles")
public record CharacterProfile(
        @Id Long id,
        String name,
        String world,
        String job,
        RankingRegion region,
        Long weeklyRank,
        Long weeklyExperience,
        String imageUrl,
        String sourceUrl,
        Instant retrievedAt,
        Instant createdAt,
        Instant updatedAt
) {
}
