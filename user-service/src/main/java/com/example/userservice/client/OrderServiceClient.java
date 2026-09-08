package com.example.userservice.client;

import com.example.userservice.vo.ResponseOrder;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "order-service")
public interface OrderServiceClient {

    /**
     * user-service 전용 내부 조회 API.
     * Gateway에는 이 경로를 노출하지 않으며 Eureka/Feign으로만 호출한다.
     */
    @GetMapping("/order-service/internal/{userId}/orders")
    List<ResponseOrder> getOrders(@PathVariable("userId") String userId);
}
