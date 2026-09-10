package app.maplehelper.equipment;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EquipmentServiceTest {

    @Mock
    private EquipmentItemRepository repository;

    @Mock
    private EquipmentCatalogItemRepository catalogRepository;

    @Mock
    private EquipmentTextParser textParser;

    @Mock
    private EquipmentFlameCalculator flameCalculator;

    private EquipmentService service;

    @BeforeEach
    void setUp() {
        service = new EquipmentService(
                repository,
                catalogRepository,
                "tesseract",
                "python",
                "scripts/count_starforce.py",
                "scripts/extract_flame_stats.py",
                "scripts/preprocess_equipment_ocr.py",
                new ObjectMapper(),
                textParser,
                flameCalculator);
    }

    @Test
    void savesRingToFirstEmptyRingSlotForProfile() {
        when(repository.findAllByCharacterProfileIdOrderByUpdatedAtDesc(7L)).thenReturn(Flux.just(
                item(1L, EquipmentSlot.RING, 1),
                item(2L, EquipmentSlot.RING, 2),
                item(3L, EquipmentSlot.RING, 3)));
        when(repository.save(any(EquipmentItem.class))).thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

        StepVerifier.create(service.confirm(request(7L, EquipmentSlot.RING, null, "Guardian Angel Ring")))
                .assertNext(saved -> {
                    assertThat(saved.slot()).isEqualTo(EquipmentSlot.RING);
                    assertThat(saved.slotIndex()).isEqualTo(4);
                })
                .verifyComplete();

        verify(repository, never()).deleteById(any(Long.class));
    }

    @Test
    void replacesChosenRingSlotWhenRingFamilyIsFull() {
        when(repository.findAllByCharacterProfileIdOrderByUpdatedAtDesc(7L)).thenReturn(Flux.just(
                item(1L, EquipmentSlot.RING, 1),
                item(2L, EquipmentSlot.RING, 2),
                item(3L, EquipmentSlot.RING, 3),
                item(4L, EquipmentSlot.RING, 4)));
        when(repository.deleteById(2L)).thenReturn(Mono.empty());
        when(repository.save(any(EquipmentItem.class))).thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

        StepVerifier.create(service.confirm(request(7L, EquipmentSlot.RING, 2, "Endless Terror")))
                .assertNext(saved -> {
                    assertThat(saved.slot()).isEqualTo(EquipmentSlot.RING);
                    assertThat(saved.slotIndex()).isEqualTo(2);
                })
                .verifyComplete();

        verify(repository).deleteById(2L);
    }

    @Test
    void replacesSingleSlotEquipmentForProfile() {
        when(repository.findAllByCharacterProfileIdOrderByUpdatedAtDesc(7L)).thenReturn(Flux.just(
                item(8L, EquipmentSlot.BELT, null)));
        when(repository.deleteById(8L)).thenReturn(Mono.empty());
        when(repository.save(any(EquipmentItem.class))).thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

        StepVerifier.create(service.confirm(request(7L, EquipmentSlot.BELT, null, "Dreamy Belt")))
                .assertNext(saved -> assertThat(saved.slot()).isEqualTo(EquipmentSlot.BELT))
                .verifyComplete();

        verify(repository).deleteById(8L);
    }

    @Test
    void detectsSweetwaterItemsForFlameSkip() {
        assertThat(EquipmentService.isSweetwaterItem("Sweetwater Tattoo")).isTrue();
        assertThat(EquipmentService.isSweetwaterItem("Commanding Force Earring")).isFalse();
    }

    @Test
    void prefersColorExtractedFlamesForWeapons() {
        ParsedEquipmentText parsed = new ParsedEquipmentText(
                EquipmentSlot.WEAPON,
                "Destiny Bladecaster",
                250,
                0,
                "Attack Power +902 (373 +261 +268)",
                "Attack Power: +268",
                "Legendary",
                "",
                "",
                "");
        String extractedFlames = String.join(System.lineSeparator(),
                "LUK: +72",
                "All Stats: +5%",
                "Attack Power: +268",
                "Boss Damage: +10%");
        when(flameCalculator.deriveFlameStats(parsed)).thenReturn("Attack Power: +268");

        assertThat(service.preferredFlameStats(parsed, extractedFlames)).isEqualTo(extractedFlames);
    }

    private ConfirmEquipmentRequest request(Long profileId, EquipmentSlot slot, Integer slotIndex, String name) {
        return new ConfirmEquipmentRequest(
                profileId,
                slot,
                slotIndex,
                name,
                200,
                22,
                "STR +100",
                null,
                null,
                "Legendary",
                "STR: +13%",
                null,
                null,
                "");
    }

    private EquipmentItem item(Long id, EquipmentSlot slot, Integer slotIndex) {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        return new EquipmentItem(
                id,
                7L,
                slot,
                slotIndex,
                slot.name(),
                200,
                22,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                now,
                now);
    }
}
