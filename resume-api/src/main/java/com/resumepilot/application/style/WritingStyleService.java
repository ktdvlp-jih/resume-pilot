package com.resumepilot.application.style;

import com.resumepilot.domain.resume.Resume;
import com.resumepilot.domain.resume.ResumeRepository;
import com.resumepilot.domain.resume.ResumeVersionRepository;
import com.resumepilot.domain.style.UserWritingStyle;
import com.resumepilot.domain.style.UserWritingStyleRepository;
import com.resumepilot.infrastructure.ai.AiGatewayClient;
import com.resumepilot.infrastructure.ai.RagServiceClient;
import com.resumepilot.presentation.dto.style.WritingStyleAnalyzeRequest;
import com.resumepilot.presentation.dto.style.WritingStyleResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class WritingStyleService {

    private final UserWritingStyleRepository styleRepository;
    private final AiGatewayClient aiGatewayClient;
    private final RagServiceClient ragServiceClient;
    private final ResumeRepository resumeRepository;
    private final ResumeVersionRepository resumeVersionRepository;

    /**
     * 사용자가 문체 분석을 한 번도 하지 않았다면, 저장된 자소서(Resume) 최신 버전 내용으로
     * 자동 분석해 둔다. 이미 분석 결과가 있거나 분석할 자소서가 없으면 아무 것도 하지 않는다.
     */
    @Transactional
    public void ensureAnalyzed(UUID userId) {
        if (styleRepository.findTopByUserIdOrderByUpdatedAtDesc(userId).isPresent()) {
            return;
        }
        resumeRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream()
                .findFirst()
                .flatMap(resume -> resumeVersionRepository.findTopByResumeIdOrderByVersionNumberDesc(resume.getId())
                        .map(version -> Map.entry(resume, version.getContent())))
                .filter(entry -> entry.getValue() != null && !entry.getValue().isBlank())
                .ifPresent(entry -> {
                    Resume resume = entry.getKey();
                    try {
                        analyze(userId, new WritingStyleAnalyzeRequest(entry.getValue(), resume.getId().toString()));
                    } catch (Exception e) {
                        log.warn("자동 문체 분석 실패 (userId={}): {}", userId, e.getMessage());
                    }
                });
    }

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

    private List<String> toStringList(Object o) {
        if (o instanceof List<?> list) {
            return list.stream().map(String::valueOf).toList();
        }
        return List.of();
    }
}
