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

    public Mono<CharacterProfile> importAndSave(CreateCharacterProfileRequest request) {
        String name = request.name().trim();
        return characterDataProvider.findByName(name, request.region())
                .flatMap(imported -> repository
                        .findByNameIgnoreCaseAndRegion(imported.name(), imported.region())
                        .flatMap(existing -> repository.save(fromImport(imported, existing.id(), existing.createdAt())))
                        .switchIfEmpty(Mono.defer(() -> repository.save(fromImport(imported, null, Instant.now())))));
    }

    public Flux<CharacterProfile> findAll() {
        return repository.findAllByOrderByUpdatedAtDesc();
    }

    public Mono<CharacterProfile> findById(long id) {
        return repository.findById(id)
                .switchIfEmpty(Mono.error(new CharacterProfileNotFoundException(id)));
    }

    public Mono<CharacterProfile> update(long id, UpdateCharacterProfileRequest request) {
        return findById(id).flatMap(existing -> repository.save(new CharacterProfile(
                existing.id(), existing.name(), request.world().trim(), request.job().trim(), existing.region(),
                existing.weeklyRank(), existing.weeklyExperience(), existing.imageUrl(), existing.sourceUrl(),
                existing.retrievedAt(), existing.createdAt(), Instant.now())));
    }

    public Mono<Void> delete(long id) {
        return findById(id).flatMap(repository::delete);
    }

    private CharacterProfile fromImport(ImportedCharacter imported, Long id, Instant createdAt) {
        Instant now = Instant.now();
        return new CharacterProfile(
                id,
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
