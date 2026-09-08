package com.example.catalogservice.vo;

import lombok.Data;

@Data
public class RequestCatalogUpdate {
    private String productName;
    private Integer stock;
    private Integer unitPrice;
}
