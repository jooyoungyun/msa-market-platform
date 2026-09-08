package com.example.orderservice.config;

import com.example.orderservice.jpa.OrderEntity;
import com.example.orderservice.jpa.OrderRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class OrderDataInitializer implements CommandLineRunner {
    private final OrderRepository orderRepository;

    @Value("${app.init-data.enabled:true}")
    private boolean initDataEnabled;

    public OrderDataInitializer(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Override
    public void run(String... args) {
        if (!initDataEnabled || orderRepository.findByOrderId("ORDER-001") != null) return;

        OrderEntity order = new OrderEntity();
        order.setOrderId("ORDER-001");
        order.setUserId("USER-001");
        order.setProductId("CATALOG-001");
        order.setQty(2);
        order.setUnitPrice(1500);
        order.setTotalPrice(3000);
        orderRepository.save(order);
    }
}
