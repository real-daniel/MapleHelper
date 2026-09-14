package app.maplehelper.equipment;

import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface EquipmentItemRepository extends ReactiveCrudRepository<EquipmentItem, Long> {

    Flux<EquipmentItem> findAllByAppUserIdOrderByUpdatedAtDesc(Long appUserId);

    Flux<EquipmentItem> findAllByAppUserIdAndCharacterProfileIdOrderByUpdatedAtDesc(Long appUserId, Long characterProfileId);

    Mono<EquipmentItem> findByIdAndAppUserId(Long id, Long appUserId);
}
