package com.example.userservice.service;

import com.example.userservice.client.OrderServiceClient;
import com.example.userservice.dto.UserDto;
import com.example.userservice.jpa.UserEntity;
import com.example.userservice.jpa.UserRepository;
import com.example.userservice.vo.RequestUserUpdate;
import com.example.userservice.vo.ResponseOrder;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.modelmapper.convention.MatchingStrategies;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.client.circuitbreaker.CircuitBreaker;
import org.springframework.cloud.client.circuitbreaker.CircuitBreakerFactory;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final OrderServiceClient orderServiceClient;
    private final CircuitBreakerFactory circuitBreakerFactory;

    // 기존 코드에 주입만 되고 한 번도 쓰이지 않던 Environment, RestTemplate 은 제거했다.
    @Autowired
    public UserServiceImpl(UserRepository userRepository,
                           BCryptPasswordEncoder passwordEncoder,
                           OrderServiceClient orderServiceClient,
                           CircuitBreakerFactory circuitBreakerFactory) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.orderServiceClient = orderServiceClient;
        this.circuitBreakerFactory = circuitBreakerFactory;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserEntity userEntity = userRepository.findByEmail(username);
        if (userEntity == null) throw new UsernameNotFoundException(username + ": not found");

        List<GrantedAuthority> authorities =
                Collections.singletonList(new SimpleGrantedAuthority(userEntity.resolveRole()));

        return new User(userEntity.getEmail(), userEntity.getEncryptedPwd(),
                true, true, true, true, authorities);
    }

    @Override
    public UserDto createUser(UserDto userDto) {
        if (userRepository.findByEmail(userDto.getEmail()) != null) {
            throw new IllegalArgumentException("Email already exists: " + userDto.getEmail());
        }
        userDto.setUserId(UUID.randomUUID().toString());
        ModelMapper mapper = new ModelMapper();
        mapper.getConfiguration().setMatchingStrategy(MatchingStrategies.STRICT);
        UserEntity userEntity = mapper.map(userDto, UserEntity.class);
        userEntity.setEncryptedPwd(passwordEncoder.encode(userDto.getPwd()));

        // 권한은 서버가 결정한다. 요청 본문으로 ROLE_ADMIN 을 밀어 넣는 권한 상승을 막기 위함.
        userEntity.setRole(UserEntity.ROLE_USER);

        userRepository.save(userEntity);
        return mapper.map(userEntity, UserDto.class);
    }

    @Override
    public UserDto getUserByUserId(String userId) {
        UserEntity userEntity = userRepository.findByUserId(userId);
        if (userEntity == null) throw new UsernameNotFoundException("User not found: " + userId);
        UserDto userDto = new ModelMapper().map(userEntity, UserDto.class);

        // order-service 장애가 회원 조회 장애로 번지지 않도록 서킷브레이커로 감싼다.
        CircuitBreaker circuitBreaker = circuitBreakerFactory.create("orders");
        List<ResponseOrder> ordersList = circuitBreaker.run(
                () -> orderServiceClient.getOrders(userId),
                throwable -> {
                    log.warn("order-service 조회 실패, 빈 목록으로 대체합니다. userId={}", userId, throwable);
                    return new ArrayList<ResponseOrder>();
                });

        userDto.setOrders(ordersList);
        return userDto;
    }

    @Override
    public Iterable<UserEntity> getUserByAll() {
        return userRepository.findAll();
    }

    @Override
    public UserDto getUserDetailsByEmail(String email) {
        UserEntity userEntity = userRepository.findByEmail(email);
        if (userEntity == null) throw new UsernameNotFoundException(email);
        ModelMapper mapper = new ModelMapper();
        mapper.getConfiguration().setMatchingStrategy(MatchingStrategies.STRICT);
        UserDto userDto = mapper.map(userEntity, UserDto.class);
        userDto.setRole(userEntity.resolveRole());
        return userDto;
    }

    @Override
    public UserEntity updateUser(String userId, RequestUserUpdate request) {
        UserEntity entity = userRepository.findByUserId(userId);
        if (entity == null) throw new UsernameNotFoundException("User not found: " + userId);

        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()
                && !request.getEmail().equals(entity.getEmail())) {
            UserEntity sameEmail = userRepository.findByEmail(request.getEmail());
            if (sameEmail != null && !sameEmail.getUserId().equals(userId)) {
                throw new IllegalArgumentException("Email already exists: " + request.getEmail());
            }
            entity.setEmail(request.getEmail().trim());
        }
        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            entity.setName(request.getName().trim());
        }
        if (request.getPwd() != null && !request.getPwd().trim().isEmpty()) {
            if (request.getPwd().length() < 8) {
                throw new IllegalArgumentException("Password must be at least 8 characters");
            }
            entity.setEncryptedPwd(passwordEncoder.encode(request.getPwd()));
        }
        return userRepository.save(entity);
    }

    @Override
    public void deleteUser(String userId) {
        UserEntity entity = userRepository.findByUserId(userId);
        if (entity == null) throw new UsernameNotFoundException("User not found: " + userId);
        userRepository.delete(entity);
    }
}
