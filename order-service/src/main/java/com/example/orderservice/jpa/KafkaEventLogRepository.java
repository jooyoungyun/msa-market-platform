package com.example.orderservice.jpa;

import org.springframework.data.jpa.repository.JpaRepository;

public interface KafkaEventLogRepository extends JpaRepository<KafkaEventLogEntity, Long> {
}
