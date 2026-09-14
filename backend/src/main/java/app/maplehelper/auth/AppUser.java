package app.maplehelper.auth;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;

@Table("app_users")
public record AppUser(
        @Id Long id,
        String discordUserId,
        String username,
        String displayName,
        String avatarUrl,
        Instant createdAt,
        Instant updatedAt
) {
}
