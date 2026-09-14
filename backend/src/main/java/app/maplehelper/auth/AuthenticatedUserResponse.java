package app.maplehelper.auth;

public record AuthenticatedUserResponse(
        long id,
        String discordUserId,
        String username,
        String displayName,
        String avatarUrl
) {
    static AuthenticatedUserResponse from(DiscordPrincipal user) {
        return new AuthenticatedUserResponse(
                user.appUserId(),
                user.getName(),
                user.username(),
                user.displayName(),
                user.avatarUrl());
    }
}
