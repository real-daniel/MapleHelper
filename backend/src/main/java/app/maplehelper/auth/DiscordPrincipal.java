package app.maplehelper.auth;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;

import java.io.Serial;
import java.util.Collection;
import java.util.Map;

public final class DiscordPrincipal extends DefaultOAuth2User {

    @Serial
    private static final long serialVersionUID = 1L;

    private final long appUserId;
    private final String username;
    private final String displayName;
    private final String avatarUrl;

    public DiscordPrincipal(
            Collection<? extends GrantedAuthority> authorities,
            Map<String, Object> attributes,
            AppUser user) {
        super(authorities, attributes, "id");
        this.appUserId = user.id();
        this.username = user.username();
        this.displayName = user.displayName();
        this.avatarUrl = user.avatarUrl();
    }

    public long appUserId() {
        return appUserId;
    }

    public String username() {
        return username;
    }

    public String displayName() {
        return displayName;
    }

    public String avatarUrl() {
        return avatarUrl;
    }
}
