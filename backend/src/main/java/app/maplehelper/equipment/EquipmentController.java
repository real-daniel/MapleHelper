package app.maplehelper.equipment;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/equipment")
public class EquipmentController {

    private final EquipmentService service;

    public EquipmentController(EquipmentService service) {
        this.service = service;
    }

    @PostMapping(path = "/extract", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Mono<EquipmentExtractionDraft> extract(@RequestPart("file") FilePart file) {
        return service.extractDraft(file);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<EquipmentItem> confirm(@Valid @RequestBody ConfirmEquipmentRequest request) {
        return service.confirm(request);
    }

    @GetMapping
    public Flux<EquipmentItem> findAll(@RequestParam(required = false) Long characterProfileId) {
        return service.findAll(characterProfileId);
    }

    @GetMapping("/catalog")
    public Flux<EquipmentCatalogItem> findCatalog(@RequestParam(required = false) EquipmentSlot slot) {
        return service.findCatalog(slot);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> delete(@PathVariable Long id) {
        return service.delete(id);
    }
}
