package app.maplehelper.equipment;

import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface EquipmentItemRepository extends ReactiveCrudRepository<EquipmentItem, Long> {

    Flux<EquipmentItem> findAllByOrderByUpdatedAtDesc();

    Flux<EquipmentItem> findAllByCharacterProfileIdOrderByUpdatedAtDesc(Long characterProfileId);
}
