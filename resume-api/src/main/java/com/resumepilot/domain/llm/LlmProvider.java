package com.resumepilot.domain.llm;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "llm_providers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LlmProvider {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String slug;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider_type", nullable = false, length = 30)
    @Builder.Default
    private LlmProviderType providerType = LlmProviderType.OPENAI_COMPAT;

    @Column(name = "base_url", length = 500)
    private String baseUrl;

    @Column(name = "api_key_ciphertext", columnDefinition = "TEXT")
    private String apiKeyCiphertext;

    @Builder.Default
    private boolean enabled = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public boolean hasApiKey() {
        return apiKeyCiphertext != null && !apiKeyCiphertext.isBlank();
    }
}
