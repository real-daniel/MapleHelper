package app.maplehelper.profile;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import app.maplehelper.auth.DiscordPrincipal;

@RestController
@RequestMapping("/api/v1/profiles")
public class CharacterProfileController {

    private final CharacterProfileService service;

    public CharacterProfileController(CharacterProfileService service) {
        this.service = service;
    }

    @PostMapping("/import")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<CharacterProfile> importProfile(
            @Valid @RequestBody CreateCharacterProfileRequest request,
            @AuthenticationPrincipal DiscordPrincipal user) {
        return service.importAndSave(request, user.appUserId());
    }

    @GetMapping
    public Flux<CharacterProfile> findAll(@AuthenticationPrincipal DiscordPrincipal user) {
        return service.findAll(user.appUserId());
    }

    @GetMapping("/{id}")
    public Mono<CharacterProfile> findById(
            @PathVariable long id,
            @AuthenticationPrincipal DiscordPrincipal user) {
        return service.findById(id, user.appUserId());
    }

    @PutMapping("/{id}")
    public Mono<CharacterProfile> update(
            @PathVariable long id,
            @Valid @RequestBody UpdateCharacterProfileRequest request,
            @AuthenticationPrincipal DiscordPrincipal user) {
        return service.update(id, request, user.appUserId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> delete(
            @PathVariable long id,
            @AuthenticationPrincipal DiscordPrincipal user) {
        return service.delete(id, user.appUserId());
    }
}
