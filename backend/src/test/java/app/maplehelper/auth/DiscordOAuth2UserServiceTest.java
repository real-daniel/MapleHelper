package app.maplehelper.auth;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.ReactiveOAuth2UserService;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DiscordOAuth2UserServiceTest {

    @Mock
    private AppUserRepository repository;

    @Mock
    private ReactiveOAuth2UserService<OAuth2UserRequest, OAuth2User> delegate;

    @Mock
    private OAuth2UserRequest request;

    @Test
    void springSelectsTheRepositoryConstructor() {
        try (var context = new AnnotationConfigApplicationContext()) {
            context.getBeanFactory().registerSingleton("appUserRepository", repository);
            context.register(DiscordOAuth2UserService.class);
            context.refresh();

            assertThat(context.getBean(DiscordOAuth2UserService.class)).isNotNull();
        }
    }

    @Test
    void createsAnApplicationUserFromDiscordIdentity() {
        OAuth2User discordUser = new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("OAUTH2_USER")),
                Map.of(
                        "id", "123456789",
                        "username", "mapler",
                        "global_name", "Mapler",
                        "avatar", "avatar-hash"),
                "id");
        when(delegate.loadUser(request)).thenReturn(Mono.just(discordUser));
        when(repository.findByDiscordUserId("123456789")).thenReturn(Mono.empty());
        when(repository.save(any(AppUser.class))).thenAnswer(invocation -> {
            AppUser proposed = invocation.getArgument(0);
            return Mono.just(new AppUser(
                    42L,
                    proposed.discordUserId(),
                    proposed.username(),
                    proposed.displayName(),
                    proposed.avatarUrl(),
                    proposed.createdAt(),
                    proposed.updatedAt()));
        });

        var service = new DiscordOAuth2UserService(repository, delegate);

        StepVerifier.create(service.loadUser(request))
                .assertNext(principal -> {
                    DiscordPrincipal discordPrincipal = (DiscordPrincipal) principal;
                    assertThat(discordPrincipal.appUserId()).isEqualTo(42L);
                    assertThat(discordPrincipal.getName()).isEqualTo("123456789");
                    assertThat(discordPrincipal.displayName()).isEqualTo("Mapler");
                    assertThat(discordPrincipal.avatarUrl())
                            .isEqualTo("https://cdn.discordapp.com/avatars/123456789/avatar-hash.png?size=128");
                })
                .verifyComplete();
    }
}
