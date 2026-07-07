package app.maplehelper.equipment;

import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface EquipmentCatalogItemRepository extends ReactiveCrudRepository<EquipmentCatalogItem, Long> {

    Flux<EquipmentCatalogItem> findAllByOrderBySlotAscLevelRequirementAscNameAsc();

    Flux<EquipmentCatalogItem> findAllBySlotOrderByLevelRequirementAscNameAsc(EquipmentSlot slot);
}
