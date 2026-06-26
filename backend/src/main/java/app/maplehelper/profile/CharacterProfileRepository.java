package app.maplehelper.profile;

import app.maplehelper.character.RankingRegion;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface CharacterProfileRepository extends ReactiveCrudRepository<CharacterProfile, Long> {

    Mono<CharacterProfile> findByNameIgnoreCaseAndRegion(String name, RankingRegion region);

    Flux<CharacterProfile> findAllByOrderByUpdatedAtDesc();
}
