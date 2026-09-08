package com.example.catalogservice.jpa;

import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import javax.persistence.*;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "kafka_event_log")
public class KafkaEventLogEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64)
    private String eventId;

    @Column(nullable = false, length = 40)
    private String stage;

    @Column(nullable = false, length = 60)
    private String eventType;

    @Column(length = 120)
    private String topic;

    private Integer partitionNo;
    private Long offsetNo;

    @Column(length = 80)
    private String producer;

    @Column(length = 80)
    private String consumer;

    @Column(length = 120)
    private String messageKey;

    @Column(length = 120)
    private String orderId;

    @Column(length = 120)
    private String productId;

    private Integer beforeStock;
    private Integer afterStock;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(length = 1000)
    private String errorMessage;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String payload;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
