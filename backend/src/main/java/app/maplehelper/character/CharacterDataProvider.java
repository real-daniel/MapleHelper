package app.maplehelper.character;

import reactor.core.publisher.Mono;

public interface CharacterDataProvider {

    Mono<ImportedCharacter> findByName(String name, RankingRegion region);
}

