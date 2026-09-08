package com.example.userservice.config;

import com.example.userservice.jpa.UserEntity;
import com.example.userservice.jpa.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@Slf4j
public class UserDataInitializer implements CommandLineRunner {
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Value("${app.init-data.enabled:true}")
    private boolean initDataEnabled;

    public UserDataInitializer(UserRepository userRepository, BCryptPasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (!initDataEnabled) return;

        backfillMissingRoles();

        createIfAbsent("USER-001", "test@test.com", "Test User", "test1234", UserEntity.ROLE_USER);
        ensureAdminAccount();
    }

    /**
     * ddl-auto=update 로 role 컬럼이 뒤늦게 추가된 경우, 기존 회원은 role 이 null 이다.
     * 기동 시 한 번 ROLE_USER 로 채워 준다.
     */
    private void backfillMissingRoles() {
        List<UserEntity> updated = new ArrayList<>();
        for (UserEntity entity : userRepository.findAll()) {
            if (entity.getRole() == null || entity.getRole().trim().isEmpty()) {
                entity.setRole(UserEntity.ROLE_USER);
                updated.add(entity);
            }
        }
        if (!updated.isEmpty()) {
            userRepository.saveAll(updated);
            log.info("role 이 비어 있던 회원 {}건을 ROLE_USER 로 초기화했습니다.", updated.size());
        }
    }

    private void ensureAdminAccount() {
        final String email = "admin@test.com";
        UserEntity existing = userRepository.findByEmail(email);
        if (existing != null) {
            if (!UserEntity.ROLE_ADMIN.equals(existing.resolveRole())) {
                existing.setRole(UserEntity.ROLE_ADMIN);
                userRepository.save(existing);
                log.info("기존 관리자 계정 권한 보정: {} ({})", email, UserEntity.ROLE_ADMIN);
            }
            return;
        }
        createIfAbsent("ADMIN-001", email, "Admin User", "admin1234", UserEntity.ROLE_ADMIN);
    }

    private void createIfAbsent(String userId, String email, String name, String rawPwd, String role) {
        if (userRepository.findByEmail(email) != null) return;

        UserEntity user = new UserEntity();
        user.setUserId(userId);
        user.setEmail(email);
        user.setName(name);
        user.setEncryptedPwd(passwordEncoder.encode(rawPwd));
        user.setRole(role);
        userRepository.save(user);
        log.info("초기 계정 생성: {} ({})", email, role);
    }
}
