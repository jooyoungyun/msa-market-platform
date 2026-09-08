package com.example.catalogservice.service;

import com.example.catalogservice.jpa.CatalogEntity;
import com.example.catalogservice.vo.RequestCatalogUpdate;

public interface CatalogService {
    CatalogEntity createCatalog(CatalogEntity catalogEntity);
    Iterable<CatalogEntity> getAllCatalogs();
    CatalogEntity getCatalog(String productId);
    CatalogEntity updateCatalog(String productId, RequestCatalogUpdate request);
    void deleteCatalog(String productId);
}
