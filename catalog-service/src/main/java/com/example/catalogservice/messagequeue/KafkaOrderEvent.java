package com.example.catalogservice.messagequeue;

import lombok.Data;

@Data
public class KafkaOrderEvent {
    private String eventId;
    private String eventType;
    private String orderId;
    private String userId;
    private String productId;
    private Integer qty;
    private Integer unitPrice;
    private Integer totalPrice;
    private String occurredAt;
}
