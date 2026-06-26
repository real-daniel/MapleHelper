package app.maplehelper.profile;

import app.maplehelper.character.CharacterDataProvider;
import app.maplehelper.character.ImportedCharacter;
import app.maplehelper.character.RankingRegion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.net.URI;
import java.time.Instant;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CharacterProfileServiceTest {

    @Mock
    private CharacterDataProvider provider;

    @Mock
    private CharacterProfileRepository repository;

    private CharacterProfileService service;

    @BeforeEach
    void setUp() {
        service = new CharacterProfileService(provider, repository);
    }

    @Test
    void importsAndSavesANewProfile() {
        var imported = importedCharacter();
        when(provider.findByName("Unbob", RankingRegion.NORTH_AMERICA)).thenReturn(Mono.just(imported));
        when(repository.findByNameIgnoreCaseAndRegion("Unbob", RankingRegion.NORTH_AMERICA)).thenReturn(Mono.empty());
        when(repository.save(any(CharacterProfile.class))).thenAnswer(invocation ->
                Mono.just(invocation.getArgument(0, CharacterProfile.class)));

        StepVerifier.create(service.importAndSave(new CreateCharacterProfileRequest(" Unbob ", RankingRegion.NORTH_AMERICA)))
                .assertNext(profile -> {
                    org.assertj.core.api.Assertions.assertThat(profile.id()).isNull();
                    org.assertj.core.api.Assertions.assertThat(profile.name()).isEqualTo("Unbob");
                    org.assertj.core.api.Assertions.assertThat(profile.world()).isEqualTo("Kronos");
                    org.assertj.core.api.Assertions.assertThat(profile.imageUrl()).contains("msavatar1.nexon.net");
                    org.assertj.core.api.Assertions.assertThat(profile.createdAt()).isNotNull();
                })
                .verifyComplete();
    }

    @Test
    void refreshesAnExistingProfileWithoutChangingItsIdentity() {
        var imported = importedCharacter();
        Instant createdAt = Instant.parse("2026-01-01T00:00:00Z");
        var existing = new CharacterProfile(
                42L, "Unbob", "Kronos", "Adele", RankingRegion.NORTH_AMERICA,
                10L, 20L, null, imported.sourceUrl().toString(), imported.retrievedAt(), createdAt, createdAt);

        when(provider.findByName("Unbob", RankingRegion.NORTH_AMERICA)).thenReturn(Mono.just(imported));
        when(repository.findByNameIgnoreCaseAndRegion("Unbob", RankingRegion.NORTH_AMERICA)).thenReturn(Mono.just(existing));
        when(repository.save(any(CharacterProfile.class))).thenAnswer(invocation ->
                Mono.just(invocation.getArgument(0, CharacterProfile.class)));

        StepVerifier.create(service.importAndSave(new CreateCharacterProfileRequest("Unbob", RankingRegion.NORTH_AMERICA)))
                .assertNext(profile -> {
                    org.assertj.core.api.Assertions.assertThat(profile.id()).isEqualTo(42L);
                    org.assertj.core.api.Assertions.assertThat(profile.createdAt()).isEqualTo(createdAt);
                    org.assertj.core.api.Assertions.assertThat(profile.weeklyRank()).isEqualTo(38_735L);
                })
                .verifyComplete();
    }

    private ImportedCharacter importedCharacter() {
        return new ImportedCharacter(
                "Unbob", "Kronos", "Adele", 38_735L, 8_959_427_436_195L,
                URI.create("https://msavatar1.nexon.net/Character/avatar.png"),
                RankingRegion.NORTH_AMERICA,
                URI.create("https://www.nexon.com/maplestory/rankings/na/overall/weekly"),
                Instant.parse("2026-06-18T12:00:00Z"));
    }
}
