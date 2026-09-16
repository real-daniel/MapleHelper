package app.maplehelper.profile;

import app.maplehelper.character.RankingRegion;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface CharacterProfileRepository extends ReactiveCrudRepository<CharacterProfile, Long> {

    Mono<CharacterProfile> findByAppUserIdAndNameIgnoreCaseAndRegion(Long appUserId, String name, RankingRegion region);

    Flux<CharacterProfile> findAllByAppUserIdOrderByUpdatedAtDesc(Long appUserId);

    Mono<CharacterProfile> findByIdAndAppUserId(Long id, Long appUserId);
}
