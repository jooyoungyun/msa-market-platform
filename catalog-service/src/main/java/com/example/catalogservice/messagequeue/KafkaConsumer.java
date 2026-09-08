package com.example.catalogservice.messagequeue;

import com.example.catalogservice.jpa.CatalogEntity;
import com.example.catalogservice.jpa.CatalogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class KafkaConsumer {
    private final CatalogRepository repository;
    private final KafkaEventLogService eventLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public KafkaConsumer(CatalogRepository repository, KafkaEventLogService eventLogService) {
        this.repository = repository;
        this.eventLogService = eventLogService;
    }

    @KafkaListener(topics = "${app.kafka.catalog-topic:example-catalog-topic}")
    @Transactional
    public void updateQty(ConsumerRecord<String, String> record) {
        String payload = record.value();
        KafkaOrderEvent event = null;

        try {
            event = objectMapper.readValue(payload, KafkaOrderEvent.class);
            eventLogService.save(event, "CONSUMED", record.topic(), record.partition(),
                    record.offset(), payload, null, null, "SUCCESS", null);

            CatalogEntity entity = repository.findByProductId(event.getProductId());
            if (entity == null) {
                eventLogService.save(event, "CONSUMER_ERROR", record.topic(), record.partition(),
                        record.offset(), payload, null, null, "ERROR", "Catalog product not found");
                return;
            }

            int beforeStock = entity.getStock();
            int afterStock;
            String completedStage;

            if ("ORDER_CANCELLED".equals(event.getEventType())) {
                afterStock = beforeStock + event.getQty();
                completedStage = "INVENTORY_RESTORED";
            } else if ("ORDER_CREATED".equals(event.getEventType())) {
                afterStock = beforeStock - event.getQty();
                completedStage = "INVENTORY_UPDATED";
                if (afterStock < 0) {
                    eventLogService.save(event, "CONSUMER_ERROR", record.topic(), record.partition(),
                            record.offset(), payload, beforeStock, beforeStock,
                            "ERROR", "Insufficient stock");
                    return;
                }
            } else {
                eventLogService.save(event, "CONSUMER_ERROR", record.topic(), record.partition(),
                        record.offset(), payload, beforeStock, beforeStock,
                        "ERROR", "Unsupported eventType: " + event.getEventType());
                return;
            }

            entity.setStock(afterStock);
            repository.save(entity);

            eventLogService.save(event, completedStage, record.topic(), record.partition(),
                    record.offset(), payload, beforeStock, afterStock, "SUCCESS", null);

            log.info("Kafka inventory processed eventId={}, eventType={}, productId={}, {} -> {}, partition={}, offset={}",
                    event.getEventId(), event.getEventType(), event.getProductId(), beforeStock, afterStock,
                    record.partition(), record.offset());
        } catch (Exception ex) {
            log.error("Kafka consumer processing failed. payload={}", payload, ex);
            if (event != null) {
                eventLogService.save(event, "CONSUMER_ERROR", record.topic(), record.partition(),
                        record.offset(), payload, null, null, "ERROR", ex.getMessage());
            }
        }
    }
}
