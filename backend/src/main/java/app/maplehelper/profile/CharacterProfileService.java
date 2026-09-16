package app.maplehelper.profile;

import app.maplehelper.character.CharacterDataProvider;
import app.maplehelper.character.ImportedCharacter;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;

@Service
public class CharacterProfileService {

    private final CharacterDataProvider characterDataProvider;
    private final CharacterProfileRepository repository;

    public CharacterProfileService(
            CharacterDataProvider characterDataProvider,
            CharacterProfileRepository repository) {
        this.characterDataProvider = characterDataProvider;
        this.repository = repository;
    }

    public Mono<CharacterProfile> importAndSave(CreateCharacterProfileRequest request, long appUserId) {
        String name = request.name().trim();
        return characterDataProvider.findByName(name, request.region())
                .flatMap(imported -> repository
                        .findByAppUserIdAndNameIgnoreCaseAndRegion(appUserId, imported.name(), imported.region())
                        .flatMap(existing -> repository.save(fromImport(imported, existing.id(), appUserId, existing.createdAt())))
                        .switchIfEmpty(Mono.defer(() -> repository.save(fromImport(imported, null, appUserId, Instant.now())))));
    }

    public Flux<CharacterProfile> findAll(long appUserId) {
        return repository.findAllByAppUserIdOrderByUpdatedAtDesc(appUserId);
    }

    public Mono<CharacterProfile> findById(long id, long appUserId) {
        return repository.findByIdAndAppUserId(id, appUserId)
                .switchIfEmpty(Mono.error(new CharacterProfileNotFoundException(id)));
    }

    public Mono<CharacterProfile> update(long id, UpdateCharacterProfileRequest request, long appUserId) {
        return findById(id, appUserId).flatMap(existing -> repository.save(new CharacterProfile(
                existing.id(), existing.appUserId(), existing.name(), request.world().trim(), request.job().trim(), existing.region(),
                existing.weeklyRank(), existing.weeklyExperience(), existing.imageUrl(), existing.sourceUrl(),
                existing.retrievedAt(), existing.createdAt(), Instant.now())));
    }

    public Mono<Void> delete(long id, long appUserId) {
        return findById(id, appUserId).flatMap(repository::delete);
    }

    private CharacterProfile fromImport(ImportedCharacter imported, Long id, long appUserId, Instant createdAt) {
        Instant now = Instant.now();
        return new CharacterProfile(
                id,
                appUserId,
                imported.name(),
                imported.world(),
                imported.job(),
                imported.region(),
                imported.weeklyRank(),
                imported.weeklyExperience(),
                imported.imageUrl() == null ? null : imported.imageUrl().toString(),
                imported.sourceUrl().toString(),
                imported.retrievedAt(),
                createdAt,
                now);
    }
}
