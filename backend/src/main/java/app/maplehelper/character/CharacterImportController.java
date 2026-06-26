package app.maplehelper.character;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@Validated
@RestController
@RequestMapping("/api/v1/characters")
public class CharacterImportController {

    private final CharacterImportService characterImportService;

    public CharacterImportController(CharacterImportService characterImportService) {
        this.characterImportService = characterImportService;
    }

    @GetMapping("/import")
    public Mono<ImportedCharacter> importCharacter(
            @RequestParam
            @NotBlank
            @Size(max = 20)
            @Pattern(regexp = "^[A-Za-z0-9]+$", message = "must contain only letters and numbers")
            String name,
            @RequestParam(defaultValue = "NORTH_AMERICA") RankingRegion region) {
        return characterImportService.importCharacter(name, region);
    }
}

