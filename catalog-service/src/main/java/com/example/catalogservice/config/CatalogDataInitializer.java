package com.example.catalogservice.config;

import com.example.catalogservice.jpa.CatalogEntity;
import com.example.catalogservice.jpa.CatalogRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class CatalogDataInitializer implements CommandLineRunner {
    private final CatalogRepository catalogRepository;

    @Value("${app.init-data.enabled:true}")
    private boolean initDataEnabled;

    public CatalogDataInitializer(CatalogRepository catalogRepository) {
        this.catalogRepository = catalogRepository;
    }

    @Override
    public void run(String... args) {
        if (!initDataEnabled) return;
        saveIfAbsent("CATALOG-001", "Berlin", 100, 1500);
        saveIfAbsent("CATALOG-002", "Tokyo", 110, 1000);
        saveIfAbsent("CATALOG-003", "Stockholm", 120, 2000);
    }

    private void saveIfAbsent(String productId, String productName, int stock, int unitPrice) {
        if (catalogRepository.findByProductId(productId) != null) return;

        CatalogEntity entity = new CatalogEntity();
        entity.setProductId(productId);
        entity.setProductName(productName);
        entity.setStock(stock);
        entity.setUnitPrice(unitPrice);
        catalogRepository.save(entity);
    }
}
