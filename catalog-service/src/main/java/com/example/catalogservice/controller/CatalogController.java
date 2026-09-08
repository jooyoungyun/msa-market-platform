package com.example.catalogservice.controller;

import com.example.catalogservice.jpa.CatalogEntity;
import com.example.catalogservice.service.CatalogService;
import com.example.catalogservice.vo.RequestCatalog;
import com.example.catalogservice.vo.RequestCatalogUpdate;
import com.example.catalogservice.vo.ResponseCatalog;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/catalog-service")
public class CatalogController {
    private final Environment env;
    private final CatalogService catalogService;

    @Autowired
    public CatalogController(Environment env, CatalogService catalogService) {
        this.env = env;
        this.catalogService = catalogService;
    }

    @GetMapping("/health_check")
    public String status() {
        return String.format("It's Working in Catalog Service on PORT %s", env.getProperty("local.server.port"));
    }

    @PostMapping("/catalogs")
    public ResponseEntity<ResponseCatalog> createCatalog(@RequestBody RequestCatalog request) {
        // Explicit mapping prevents ModelMapper productId -> id NumberConverter errors.
        CatalogEntity entity = new CatalogEntity();
        entity.setProductId(request.getProductId());
        entity.setProductName(request.getProductName());
        entity.setStock(request.getStock());
        entity.setUnitPrice(request.getUnitPrice());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(catalogService.createCatalog(entity)));
    }

    @GetMapping("/catalogs")
    public ResponseEntity<List<ResponseCatalog>> getCatalogs() {
        List<ResponseCatalog> result = new ArrayList<>();
        catalogService.getAllCatalogs().forEach(v -> result.add(toResponse(v)));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/catalogs/{productId}")
    public ResponseEntity<ResponseCatalog> getCatalog(@PathVariable("productId") String productId) {
        return ResponseEntity.ok(toResponse(catalogService.getCatalog(productId)));
    }

    @PutMapping("/catalogs/{productId}")
    public ResponseEntity<ResponseCatalog> updateCatalog(@PathVariable("productId") String productId,
                                                         @RequestBody RequestCatalogUpdate request) {
        return ResponseEntity.ok(toResponse(catalogService.updateCatalog(productId, request)));
    }

    @DeleteMapping("/catalogs/{productId}")
    public ResponseEntity<Void> deleteCatalog(@PathVariable("productId") String productId) {
        catalogService.deleteCatalog(productId);
        return ResponseEntity.noContent().build();
    }

    private ResponseCatalog toResponse(CatalogEntity entity) {
        ResponseCatalog response = new ResponseCatalog();
        response.setProductId(entity.getProductId());
        response.setProductName(entity.getProductName());
        response.setStock(entity.getStock());
        response.setUnitPrice(entity.getUnitPrice());
        response.setCreatedAt(entity.getCreatedAt());
        return response;
    }
}
