package com.example.orderservice.messagequeue;

import com.example.orderservice.dto.OrderDto;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;
import org.springframework.util.concurrent.ListenableFuture;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@Slf4j
public class KafkaProducer {
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final KafkaEventLogService eventLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public KafkaProducer(KafkaTemplate<String, String> kafkaTemplate,
                         KafkaEventLogService eventLogService) {
        this.kafkaTemplate = kafkaTemplate;
        this.eventLogService = eventLogService;
    }

    public String send(String topic, OrderDto orderDto) {
        return sendEvent(topic, orderDto, "ORDER_CREATED", "ORDER_STORED");
    }

    public String sendCancellation(String topic, OrderDto orderDto) {
        return sendEvent(topic, orderDto, "ORDER_CANCELLED", "ORDER_DELETED");
    }

    private String sendEvent(String topic, OrderDto orderDto, String eventType, String firstStage) {
        KafkaOrderEvent event = new KafkaOrderEvent();
        event.setEventId(UUID.randomUUID().toString());
        event.setEventType(eventType);
        event.setOrderId(orderDto.getOrderId());
        event.setUserId(orderDto.getUserId());
        event.setProductId(orderDto.getProductId());
        event.setQty(orderDto.getQty());
        event.setUnitPrice(orderDto.getUnitPrice());
        event.setTotalPrice(orderDto.getTotalPrice());
        event.setOccurredAt(LocalDateTime.now().toString());

        String payload;
        try {
            payload = objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Kafka payload serialization failed", ex);
        }

        eventLogService.save(event, firstStage, topic, null, null, payload, "SUCCESS", null);
        eventLogService.save(event, "PRODUCER_SEND", topic, null, null, payload, "PENDING", null);

        try {
            ListenableFuture<SendResult<String, String>> future =
                    kafkaTemplate.send(topic, event.getOrderId(), payload);

            future.addCallback(result -> {
                if (result == null) return;
                RecordMetadata metadata = result.getRecordMetadata();
                eventLogService.save(event, "BROKER_ACK", metadata.topic(), metadata.partition(),
                        metadata.offset(), payload, "SUCCESS", null);
                log.info("Kafka broker ack eventId={}, type={}, topic={}, partition={}, offset={}",
                        event.getEventId(), event.getEventType(), metadata.topic(), metadata.partition(), metadata.offset());
            }, ex -> {
                eventLogService.save(event, "PRODUCER_ERROR", topic, null, null, payload,
                        "ERROR", ex.getMessage());
                log.error("Kafka produce failed eventId={}, type={}", event.getEventId(), event.getEventType(), ex);
            });
        } catch (RuntimeException ex) {
            eventLogService.save(event, "PRODUCER_ERROR", topic, null, null, payload,
                    "ERROR", ex.getMessage());
            log.error("Kafka send request failed eventId={}, type={}", event.getEventId(), event.getEventType(), ex);
        }

        return event.getEventId();
    }
}
