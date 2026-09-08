package com.example.orderservice.vo;

import lombok.Data;
import java.util.Date;

@Data
public class AdminOrderResponse {
    private String orderId;
    private String userId;
    private String productId;
    private Integer qty;
    private Integer unitPrice;
    private Integer totalPrice;
    private Date createdAt;
}
