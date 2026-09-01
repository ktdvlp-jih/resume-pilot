package com.resumepilot.application.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NotionOAuthStateCodecTest {

    private final NotionOAuthStateCodec codec = new NotionOAuthStateCodec(new ObjectMapper());

    @Test
    void encodeAndDecode_roundTrip() {
        UUID userId = UUID.randomUUID();
        NotionOAuthStateCodec.State state = new NotionOAuthStateCodec.State(
                userId, "/experiences/import", "http://localhost:5173", Instant.now().getEpochSecond());
        String secret = "test-notion-secret";

        String encoded = codec.encode(state, secret);
        NotionOAuthStateCodec.State decoded = codec.decode(encoded, secret);

        assertThat(decoded.userId()).isEqualTo(userId);
        assertThat(decoded.returnPath()).isEqualTo("/experiences/import");
        assertThat(decoded.frontendUrl()).isEqualTo("http://localhost:5173");
    }

    @Test
    void decode_rejectsTamperedSignature() {
        NotionOAuthStateCodec.State state = new NotionOAuthStateCodec.State(
                UUID.randomUUID(), "/experiences/import", "http://localhost:5173", Instant.now().getEpochSecond());
        String encoded = codec.encode(state, "secret-a");
        assertThatThrownBy(() -> codec.decode(encoded, "secret-b")).isNotNull();
    }
}
