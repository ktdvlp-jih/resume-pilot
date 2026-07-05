package com.resumepilot.application.style;

import com.resumepilot.domain.style.UserWritingStyle;
import com.resumepilot.domain.style.UserWritingStyleRepository;
import com.resumepilot.infrastructure.ai.AiGatewayClient;
import com.resumepilot.infrastructure.ai.RagServiceClient;
import com.resumepilot.presentation.dto.style.WritingStyleAnalyzeRequest;
import com.resumepilot.presentation.dto.style.WritingStyleResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class WritingStyleService {

    private final UserWritingStyleRepository styleRepository;
    private final AiGatewayClient aiGatewayClient;
    private final RagServiceClient ragServiceClient;

    @Transactional(readOnly = true)
    public WritingStyleResponse getLatest(UUID userId) {
        return styleRepository.findTopByUserIdOrderByUpdatedAtDesc(userId)
                .map(this::toResponse)
                .orElse(null);
    }

    @Transactional
    public WritingStyleResponse analyze(UUID userId, WritingStyleAnalyzeRequest request) {
        Map<String, Object> payload = Map.of("content", request.content());
        Map<String, Object> result = aiGatewayClient.analyzeWritingStyle(payload);

        UserWritingStyle style = styleRepository.findTopByUserIdOrderByUpdatedAtDesc(userId)
                .orElseGet(() -> UserWritingStyle.builder().userId(userId).build());

        style.setFrequentWords(toStringList(result.get("frequent_words")));
        if (result.get("avg_sentence_length") != null) {
            style.setAvgSentenceLength(new BigDecimal(String.valueOf(result.get("avg_sentence_length"))));
        }
        if (result.get("uses_formal_speech") != null) {
            style.setUsesFormalSpeech(Boolean.valueOf(String.valueOf(result.get("uses_formal_speech"))));
        }
        style.setSentenceStyle(str(result.get("sentence_style")));
        style.setExpressionStyle(str(result.get("expression_style")));
        style.setConnectors(toStringList(result.get("connectors")));
        style.setTone(str(result.get("tone")));
        style.setAnalysisJson(result);

        if (request.resumeId() != null) {
            List<String> ids = new ArrayList<>(style.getSourceResumeIds());
            if (!ids.contains(request.resumeId())) {
                ids.add(request.resumeId());
            }
            style.setSourceResumeIds(ids);
        }

        styleRepository.save(style);

        String embedText = request.content();
        ragServiceClient.createEmbedding(userId, "WRITING_STYLE", style.getId(), embedText);

        return toResponse(style);
    }

    private WritingStyleResponse toResponse(UserWritingStyle s) {
        return new WritingStyleResponse(
                s.getId(), s.getFrequentWords(), s.getAvgSentenceLength(),
                s.getUsesFormalSpeech(), s.getSentenceStyle(), s.getExpressionStyle(),
                s.getConnectors(), s.getTone(), s.getAnalysisJson(),
                s.getSourceResumeIds(), s.getUpdatedAt()
        );
    }

    private String str(Object o) {
        return o != null ? String.valueOf(o) : null;
    }

    @SuppressWarnings("unchecked")
    private List<String> toStringList(Object o) {
        if (o instanceof List<?> list) {
            return list.stream().map(String::valueOf).toList();
        }
        return List.of();
    }
}
