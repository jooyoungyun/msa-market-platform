package com.example.catalogservice.controller;

import com.example.catalogservice.jpa.KafkaEventLogEntity;
import com.example.catalogservice.jpa.KafkaEventLogRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/catalog-service/kafka")
public class KafkaEventController {
    private final KafkaEventLogRepository repository;

    public KafkaEventController(KafkaEventLogRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/events")
    public List<KafkaEventLogEntity> events(@RequestParam(defaultValue = "100") int limit) {
        int pageSize = Math.max(1, Math.min(limit, 200));
        return repository.findAll(PageRequest.of(0, pageSize,
                Sort.by(Sort.Direction.DESC, "id"))).getContent();
    }

    @DeleteMapping("/events")
    public ResponseEntity<Void> clearEvents() {
        repository.deleteAllInBatch();
        return ResponseEntity.noContent().build();
    }
}
