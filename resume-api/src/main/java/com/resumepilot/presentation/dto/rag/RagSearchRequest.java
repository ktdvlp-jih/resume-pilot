package com.resumepilot.presentation.dto.rag;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record RagSearchRequest(
        @NotBlank String query,
        List<String> entityTypes,
        int topK
) {
    public RagSearchRequest {
        if (topK <= 0) topK = 5;
    }
}
