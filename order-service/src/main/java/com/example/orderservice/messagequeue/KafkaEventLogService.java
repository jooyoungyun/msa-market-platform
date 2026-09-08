package com.example.orderservice.messagequeue;

import com.example.orderservice.jpa.KafkaEventLogEntity;
import com.example.orderservice.jpa.KafkaEventLogRepository;
import org.springframework.stereotype.Service;

@Service
public class KafkaEventLogService {
    private final KafkaEventLogRepository repository;

    public KafkaEventLogService(KafkaEventLogRepository repository) {
        this.repository = repository;
    }

    public void save(KafkaOrderEvent event, String stage, String topic,
                     Integer partitionNo, Long offsetNo, String payload,
                     String status, String errorMessage) {
        KafkaEventLogEntity entity = new KafkaEventLogEntity();
        entity.setEventId(event.getEventId());
        entity.setStage(stage);
        entity.setEventType(event.getEventType());
        entity.setTopic(topic);
        entity.setPartitionNo(partitionNo);
        entity.setOffsetNo(offsetNo);
        entity.setProducer("ORDER-SERVICE");
        entity.setMessageKey(event.getOrderId());
        entity.setOrderId(event.getOrderId());
        entity.setProductId(event.getProductId());
        entity.setStatus(status);
        entity.setErrorMessage(errorMessage);
        entity.setPayload(payload);
        repository.save(entity);
    }
}
