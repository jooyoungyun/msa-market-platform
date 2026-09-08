package com.example.orderservice.controller;

import com.example.orderservice.dto.OrderDto;
import com.example.orderservice.jpa.OrderEntity;
import com.example.orderservice.messagequeue.KafkaProducer;
import com.example.orderservice.service.OrderService;
import com.example.orderservice.vo.AdminOrderResponse;
import com.example.orderservice.vo.RequestOrder;
import com.example.orderservice.vo.ResponseOrder;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.modelmapper.convention.MatchingStrategies;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/order-service")
@Slf4j
public class OrderController {
    private static final String AUTH_USER_ID_HEADER = "X-Auth-User-Id";
    private static final String AUTH_USER_ROLE_HEADER = "X-Auth-User-Role";
    private static final String ROLE_ADMIN = "ROLE_ADMIN";

    private final Environment env;
    private final OrderService orderService;
    private final KafkaProducer kafkaProducer;

    @Autowired
    public OrderController(Environment env, OrderService orderService, KafkaProducer kafkaProducer) {
        this.env = env;
        this.orderService = orderService;
        this.kafkaProducer = kafkaProducer;
    }

    @GetMapping("/health_check")
    public String status() {
        return String.format("It's Working in Order Service on PORT %s", env.getProperty("local.server.port"));
    }

    @PostMapping("/{userId}/orders")
    public ResponseEntity<ResponseOrder> createOrder(@PathVariable("userId") String userId,
                                                     @RequestHeader(value = AUTH_USER_ID_HEADER, required = false) String authUserId,
                                                     @RequestHeader(value = AUTH_USER_ROLE_HEADER, required = false) String authUserRole,
                                                     @RequestBody RequestOrder orderDetails) {
        requireOwnerOrAdmin(userId, authUserId, authUserRole);

        ModelMapper mapper = new ModelMapper();
        mapper.getConfiguration().setMatchingStrategy(MatchingStrategies.STRICT);
        OrderDto orderDto = mapper.map(orderDetails, OrderDto.class);
        orderDto.setUserId(userId);
        OrderDto createdOrder = orderService.createOrder(orderDto);

        String topic = env.getProperty("app.kafka.catalog-topic", "example-catalog-topic");
        String eventId = kafkaProducer.send(topic, createdOrder);
        ResponseOrder responseOrder = mapper.map(createdOrder, ResponseOrder.class);
        return ResponseEntity.status(HttpStatus.CREATED)
                .header("X-Kafka-Event-Id", eventId)
                .body(responseOrder);
    }

    @GetMapping("/{userId}/orders")
    public ResponseEntity<List<ResponseOrder>> getOrder(@PathVariable("userId") String userId,
                                                        @RequestHeader(value = AUTH_USER_ID_HEADER, required = false) String authUserId,
                                                        @RequestHeader(value = AUTH_USER_ROLE_HEADER, required = false) String authUserRole) {
        requireOwnerOrAdmin(userId, authUserId, authUserRole);
        return ResponseEntity.ok(getOrdersByUserId(userId));
    }

    /**
     * user-service Feign 전용 내부 API.
     * Gateway의 외부 Route에 매핑하지 않는다.
     */
    @GetMapping("/internal/{userId}/orders")
    public ResponseEntity<List<ResponseOrder>> getInternalOrders(@PathVariable("userId") String userId) {
        return ResponseEntity.ok(getOrdersByUserId(userId));
    }

    @GetMapping("/orders")
    public ResponseEntity<List<AdminOrderResponse>> getAllOrders() {
        List<AdminOrderResponse> result = new ArrayList<>();
        orderService.getAllOrders().forEach(v -> result.add(toAdminResponse(v)));
        return ResponseEntity.ok(result);
    }

    // Admin cancellation: delete order and publish compensating event.
    // Catalog Consumer receives ORDER_CANCELLED and restores stock (stock + qty).
    @DeleteMapping("/orders/{orderId}")
    public ResponseEntity<Void> deleteOrder(@PathVariable("orderId") String orderId) {
        OrderDto deletedOrder = orderService.deleteOrder(orderId);
        String topic = env.getProperty("app.kafka.catalog-topic", "example-catalog-topic");
        String eventId = kafkaProducer.sendCancellation(topic, deletedOrder);
        return ResponseEntity.accepted()
                .header("X-Kafka-Event-Id", eventId)
                .build();
    }

    private void requireOwnerOrAdmin(String requestedUserId, String authUserId, String authUserRole) {
        if (authUserId == null || authUserId.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 사용자 정보가 없습니다.");
        }
        if (!ROLE_ADMIN.equals(authUserRole) && !requestedUserId.equals(authUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "다른 사용자의 주문에 접근할 수 없습니다.");
        }
    }

    private List<ResponseOrder> getOrdersByUserId(String userId) {
        List<ResponseOrder> result = new ArrayList<>();
        orderService.getOrdersByUserId(userId).forEach(v -> result.add(toResponse(v)));
        return result;
    }

    private ResponseOrder toResponse(OrderEntity entity) {
        ResponseOrder response = new ResponseOrder();
        response.setOrderId(entity.getOrderId());
        response.setProductId(entity.getProductId());
        response.setQty(entity.getQty());
        response.setUnitPrice(entity.getUnitPrice());
        response.setTotalPrice(entity.getTotalPrice());
        response.setCreatedAt(entity.getCreatedAt());
        return response;
    }

    private AdminOrderResponse toAdminResponse(OrderEntity entity) {
        AdminOrderResponse response = new AdminOrderResponse();
        response.setOrderId(entity.getOrderId());
        response.setUserId(entity.getUserId());
        response.setProductId(entity.getProductId());
        response.setQty(entity.getQty());
        response.setUnitPrice(entity.getUnitPrice());
        response.setTotalPrice(entity.getTotalPrice());
        response.setCreatedAt(entity.getCreatedAt());
        return response;
    }
}
