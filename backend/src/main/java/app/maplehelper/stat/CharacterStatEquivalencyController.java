package app.maplehelper.stat;

import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/character-stat-equivalencies")
public class CharacterStatEquivalencyController {

    private final CharacterStatEquivalencyService service;

    public CharacterStatEquivalencyController(CharacterStatEquivalencyService service) {
        this.service = service;
    }

    @PostMapping(path = "/extract", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Mono<CharacterStatEquivalencyExtraction> extract(@RequestPart("file") FilePart file) {
        return service.extract(file);
    }
}
