package app.maplehelper.auth;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.DefaultReactiveOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.ReactiveOAuth2UserService;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Instant;

@Service
public class DiscordOAuth2UserService implements ReactiveOAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final ReactiveOAuth2UserService<OAuth2UserRequest, OAuth2User> delegate;
    private final AppUserRepository repository;

    @Autowired
    public DiscordOAuth2UserService(AppUserRepository repository) {
        this(repository, new DefaultReactiveOAuth2UserService());
    }

    DiscordOAuth2UserService(
            AppUserRepository repository,
            ReactiveOAuth2UserService<OAuth2UserRequest, OAuth2User> delegate) {
        this.repository = repository;
        this.delegate = delegate;
    }

    @Override
    public Mono<OAuth2User> loadUser(OAuth2UserRequest userRequest) {
        return delegate.loadUser(userRequest)
                .flatMap(discordUser -> saveUser(discordUser)
                        .map(saved -> new DiscordPrincipal(
                                discordUser.getAuthorities(),
                                discordUser.getAttributes(),
                                saved)));
    }

    private Mono<AppUser> saveUser(OAuth2User discordUser) {
        String discordUserId = requiredAttribute(discordUser, "id");
        String username = requiredAttribute(discordUser, "username");
        String displayName = optionalAttribute(discordUser, "global_name");
        if (displayName == null || displayName.isBlank()) {
            displayName = username;
        }

        String avatarHash = optionalAttribute(discordUser, "avatar");
        String avatarUrl = avatarHash == null || avatarHash.isBlank()
                ? null
                : "https://cdn.discordapp.com/avatars/" + discordUserId + "/" + avatarHash + ".png?size=128";
        Instant now = Instant.now();
        String finalDisplayName = displayName;

        return repository.findByDiscordUserId(discordUserId)
                .map(existing -> new AppUser(
                        existing.id(),
                        discordUserId,
                        username,
                        finalDisplayName,
                        avatarUrl,
                        existing.createdAt(),
                        now))
                .defaultIfEmpty(new AppUser(
                        null,
                        discordUserId,
                        username,
                        finalDisplayName,
                        avatarUrl,
                        now,
                        now))
                .flatMap(repository::save);
    }

    private String requiredAttribute(OAuth2User user, String name) {
        String value = optionalAttribute(user, name);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Discord did not return the required " + name + " attribute.");
        }
        return value;
    }

    private String optionalAttribute(OAuth2User user, String name) {
        Object value = user.getAttributes().get(name);
        return value == null ? null : value.toString();
    }
}
