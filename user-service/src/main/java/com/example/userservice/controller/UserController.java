package com.example.userservice.controller;

import com.example.userservice.dto.UserDto;
import com.example.userservice.jpa.UserEntity;
import com.example.userservice.service.UserService;
import com.example.userservice.vo.Greeting;
import com.example.userservice.vo.RequestUser;
import com.example.userservice.vo.RequestUserUpdate;
import com.example.userservice.vo.ResponseUser;
import io.micrometer.core.annotation.Timed;
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
@RequestMapping("/")
public class UserController {
    private static final String AUTH_USER_ID_HEADER = "X-Auth-User-Id";
    private static final String AUTH_USER_ROLE_HEADER = "X-Auth-User-Role";
    private static final String ROLE_ADMIN = "ROLE_ADMIN";

    private final Environment env;
    private final UserService userService;

    @Autowired
    private Greeting greeting;

    @Autowired
    public UserController(Environment env, UserService userService) {
        this.env = env;
        this.userService = userService;
    }

    @GetMapping("/health_check")
    @Timed(value = "users.status", longTask = true)
    public String status() {
        return String.format("It's Working in User Service, port=%s", env.getProperty("local.server.port"));
    }

    @GetMapping("/welcome")
    public String welcome() {
        return greeting.getMessage();
    }

    @PostMapping("/users")
    public ResponseEntity<ResponseUser> createUser(@RequestBody RequestUser user) {
        ModelMapper mapper = new ModelMapper();
        mapper.getConfiguration().setMatchingStrategy(MatchingStrategies.STRICT);
        UserDto userDto = mapper.map(user, UserDto.class);
        UserDto saved = userService.createUser(userDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapper.map(saved, ResponseUser.class));
    }

    @GetMapping("/users")
    public ResponseEntity<List<ResponseUser>> getUsers() {
        Iterable<UserEntity> userList = userService.getUserByAll();
        List<ResponseUser> result = new ArrayList<>();
        userList.forEach(v -> result.add(toResponse(v)));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<ResponseUser> getUser(@PathVariable("userId") String userId,
                                                @RequestHeader(value = AUTH_USER_ID_HEADER, required = false) String authUserId,
                                                @RequestHeader(value = AUTH_USER_ROLE_HEADER, required = false) String authUserRole) {
        requireOwnerOrAdmin(userId, authUserId, authUserRole);
        return ResponseEntity.ok(new ModelMapper().map(userService.getUserByUserId(userId), ResponseUser.class));
    }

    @PutMapping("/users/{userId}")
    public ResponseEntity<ResponseUser> updateUser(@PathVariable("userId") String userId,
                                                   @RequestBody RequestUserUpdate request) {
        return ResponseEntity.ok(toResponse(userService.updateUser(userId, request)));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable("userId") String userId) {
        userService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }

    private void requireOwnerOrAdmin(String requestedUserId, String authUserId, String authUserRole) {
        if (authUserId == null || authUserId.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 사용자 정보가 없습니다.");
        }
        if (!ROLE_ADMIN.equals(authUserRole) && !requestedUserId.equals(authUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "다른 사용자의 정보에 접근할 수 없습니다.");
        }
    }

    private ResponseUser toResponse(UserEntity entity) {
        ResponseUser response = new ResponseUser();
        response.setUserId(entity.getUserId());
        response.setEmail(entity.getEmail());
        response.setName(entity.getName());
        return response;
    }
}
