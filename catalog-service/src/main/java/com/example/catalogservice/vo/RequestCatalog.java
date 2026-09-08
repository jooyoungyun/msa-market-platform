package com.example.catalogservice.vo;

import lombok.Data;

@Data
public class RequestCatalog {
    private String productId;
    private String productName;
    private Integer stock;
    private Integer unitPrice;
}
