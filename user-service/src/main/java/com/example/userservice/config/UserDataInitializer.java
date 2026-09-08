package com.example.userservice.config;

import com.example.userservice.jpa.UserEntity;
import com.example.userservice.jpa.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
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
        if (!initDataEnabled || userRepository.findByEmail("test@test.com") != null) return;

        UserEntity user = new UserEntity();
        user.setUserId("USER-001");
        user.setEmail("test@test.com");
        user.setName("Test User");
        user.setEncryptedPwd(passwordEncoder.encode("test1234"));
        userRepository.save(user);
    }
}
