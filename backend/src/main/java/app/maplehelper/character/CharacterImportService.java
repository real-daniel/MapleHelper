package app.maplehelper.character;

import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
public class CharacterImportService {

    private final CharacterDataProvider characterDataProvider;

    public CharacterImportService(CharacterDataProvider characterDataProvider) {
        this.characterDataProvider = characterDataProvider;
    }

    public Mono<ImportedCharacter> importCharacter(String name, RankingRegion region) {
        return characterDataProvider.findByName(name.trim(), region);
    }
}

