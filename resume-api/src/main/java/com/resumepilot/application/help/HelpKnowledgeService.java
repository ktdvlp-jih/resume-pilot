package com.resumepilot.application.help;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

@Slf4j
@Service
public class HelpKnowledgeService {

    private static final String RESOURCE_PATH = "help/help-knowledge.md";

    private final AtomicReference<String> cached = new AtomicReference<>("");

    @PostConstruct
    void load() {
        try {
            ClassPathResource resource = new ClassPathResource(RESOURCE_PATH);
            String text = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
            cached.set(text);
            log.info("Loaded help knowledge ({} chars) from {}", text.length(), RESOURCE_PATH);
        } catch (IOException e) {
            log.error("Failed to load help knowledge from {}", RESOURCE_PATH, e);
            cached.set("""
                    # ResumePilot 도움말
                    서비스 안내 문서를 불러오지 못했습니다. /guides 또는 /contact 를 이용해 주세요.
                    """);
        }
    }

    public String getKnowledge() {
        return cached.get();
    }
}
