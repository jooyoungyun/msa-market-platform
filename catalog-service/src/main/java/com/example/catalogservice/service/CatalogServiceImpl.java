package com.example.catalogservice.service;

import com.example.catalogservice.jpa.CatalogEntity;
import com.example.catalogservice.jpa.CatalogRepository;
import com.example.catalogservice.vo.RequestCatalogUpdate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class CatalogServiceImpl implements CatalogService {
    private final CatalogRepository catalogRepository;

    @Autowired
    public CatalogServiceImpl(CatalogRepository catalogRepository) {
        this.catalogRepository = catalogRepository;
    }

    @Override
    public CatalogEntity createCatalog(CatalogEntity catalogEntity) {
        if (catalogRepository.findByProductId(catalogEntity.getProductId()) != null) {
            throw new IllegalArgumentException("Product already exists: " + catalogEntity.getProductId());
        }
        return catalogRepository.save(catalogEntity);
    }

    @Override
    public Iterable<CatalogEntity> getAllCatalogs() {
        return catalogRepository.findAll();
    }

    @Override
    public CatalogEntity getCatalog(String productId) {
        CatalogEntity entity = catalogRepository.findByProductId(productId);
        if (entity == null) throw new IllegalArgumentException("Product not found: " + productId);
        return entity;
    }

    @Override
    public CatalogEntity updateCatalog(String productId, RequestCatalogUpdate request) {
        CatalogEntity entity = getCatalog(productId);
        if (request.getProductName() != null && !request.getProductName().trim().isEmpty()) {
            entity.setProductName(request.getProductName().trim());
        }
        if (request.getStock() != null) {
            if (request.getStock() < 0) throw new IllegalArgumentException("Stock cannot be negative");
            entity.setStock(request.getStock());
        }
        if (request.getUnitPrice() != null) {
            if (request.getUnitPrice() < 0) throw new IllegalArgumentException("Unit price cannot be negative");
            entity.setUnitPrice(request.getUnitPrice());
        }
        return catalogRepository.save(entity);
    }

    @Override
    public void deleteCatalog(String productId) {
        catalogRepository.delete(getCatalog(productId));
    }
}
