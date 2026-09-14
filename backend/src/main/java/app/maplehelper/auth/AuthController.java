package app.maplehelper.auth;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.server.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @GetMapping("/me")
    public AuthenticatedUserResponse me(@AuthenticationPrincipal DiscordPrincipal user) {
        return AuthenticatedUserResponse.from(user);
    }

    @GetMapping("/csrf")
    @SuppressWarnings("unchecked")
    public Mono<CsrfTokenResponse> csrf(ServerWebExchange exchange) {
        Mono<CsrfToken> token = exchange.getAttribute(CsrfToken.class.getName());
        if (token == null) {
            return Mono.error(new IllegalStateException("CSRF token is unavailable."));
        }
        return token.map(value -> new CsrfTokenResponse(value.getToken(), value.getHeaderName()));
    }
}
