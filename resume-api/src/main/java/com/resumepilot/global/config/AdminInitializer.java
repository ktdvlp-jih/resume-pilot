package com.resumepilot.global.config;

import com.resumepilot.domain.user.User;
import com.resumepilot.domain.user.UserRepository;
import com.resumepilot.domain.user.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** ADMIN_EMAIL 설정 시 기동 때 관리자 계정 생성·승격 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${ADMIN_EMAIL:}")
    private String adminEmail;

    @Value("${ADMIN_PASSWORD:}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(org.springframework.boot.ApplicationArguments args) {
        if (adminEmail.isBlank()) {
            return;
        }

        userRepository.findByEmail(adminEmail).ifPresentOrElse(user -> {
            if (user.getRole() != UserRole.ADMIN) {
                user.setRole(UserRole.ADMIN);
                userRepository.save(user);
                log.info("기존 사용자를 관리자로 승격: {}", adminEmail);
            }
        }, () -> {
            if (adminPassword.isBlank()) {
                log.warn("ADMIN_PASSWORD가 없어 관리자 계정을 생성하지 않음: {}", adminEmail);
                return;
            }
            userRepository.save(User.builder()
                    .email(adminEmail)
                    .passwordHash(passwordEncoder.encode(adminPassword))
                    .role(UserRole.ADMIN)
                    .build());
            log.info("관리자 계정 생성: {}", adminEmail);
        });
    }
}
