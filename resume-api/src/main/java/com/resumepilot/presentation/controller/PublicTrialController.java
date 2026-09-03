package com.resumepilot.presentation.controller;

import com.resumepilot.application.guest.GuestContext;
import com.resumepilot.application.guest.GuestTrialService;
import com.resumepilot.domain.guest.GuestTrial;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.infrastructure.ai.AiGatewayClient;
import com.resumepilot.infrastructure.security.GuestTrialFilter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/public/trial")
@RequiredArgsConstructor
@Tag(name = "Public Trial")
public class PublicTrialController {

    private final GuestTrialService guestTrialService;
    private final AiGatewayClient aiGatewayClient;

    public record TrialJobAnalysisRequest(
            @NotBlank String sourceType,
            String content,
            String sourceUrl,
            String fileBase64,
            String mimeType
    ) {}

    public record TrialGenerateRequest(
            @NotBlank @Size(max = 20000) String jobContent,
            List<String> keywords,
            @Size(max = 2000) String experienceSummary
    ) {}

    @PostMapping("/job-analysis")
    @Operation(summary = "게스트 공고 분석 체험")
    public ApiResponse<Map<String, Object>> trialJobAnalysis(
            @Valid @RequestBody TrialJobAnalysisRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        GuestTrial trial = ensureGuest(httpRequest, httpResponse);
        guestTrialService.assertWithinLimit(trial.getGuestId(), "JOB_ANALYSIS");

        Map<String, Object> payload = new HashMap<>();
        payload.put("source_type", request.sourceType());
        payload.put("content", request.content() != null ? request.content() : "");
        if (request.sourceUrl() != null) {
            payload.put("source_url", request.sourceUrl());
        }
        if (request.fileBase64() != null && !request.fileBase64().isBlank()) {
            payload.put("file_base64", request.fileBase64());
            payload.put("mime_type", request.mimeType() != null ? request.mimeType() : "image/png");
        }
        Map<String, Object> result = aiGatewayClient.analyzeJobPosting(payload);
        guestTrialService.recordUsage(trial.getGuestId(), "JOB_ANALYSIS");
        return ApiResponse.ok(result != null ? result : Map.of());
    }

    @PostMapping("/generate")
    @Operation(summary = "게스트 자소서 생성 체험")
    public ApiResponse<Map<String, Object>> trialGenerate(
            @Valid @RequestBody TrialGenerateRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        GuestTrial trial = ensureGuest(httpRequest, httpResponse);
        guestTrialService.assertWithinLimit(trial.getGuestId(), "GENERATE");

        Map<String, Object> payload = new HashMap<>();
        payload.put("user_id", "guest:" + trial.getGuestId());
        payload.put("keywords", request.keywords() != null ? request.keywords() : List.of());
        payload.put("rewrite_level", 3);
        payload.put("job_analysis", Map.of("raw_content", request.jobContent()));
        payload.put("section_titles", List.of());
        payload.put("experience_ids", List.of());
        payload.put("section_experience_ids", List.of());
        payload.put("forbidden_expressions", List.of());
        payload.put("user_instruction", "");
        if (request.experienceSummary() != null && !request.experienceSummary().isBlank()) {
            payload.put(
                    "trial_experiences",
                    List.of(Map.of(
                            "entity_id", "guest-input-1",
                            "content", request.experienceSummary().trim()
                    ))
            );
        }
        Map<String, Object> result = aiGatewayClient.generateResume(payload);
        if (result != null) {
            result.remove("generation_id");
        }
        if (shouldCountGenerate(result)) {
            guestTrialService.recordUsage(trial.getGuestId(), "GENERATE");
        }
        return ApiResponse.ok(result != null ? result : Map.of());
    }

    @GetMapping("/status")
    @Operation(summary = "게스트 체험 사용량 조회")
    public ApiResponse<Map<String, Object>> trialStatus() {
        String guestId = GuestContext.get();
        if (guestId == null || guestId.isBlank()) {
            return ApiResponse.ok(guestTrialService.emptyStatus());
        }
        return ApiResponse.ok(guestTrialService.getStatus(guestId));
    }

    private GuestTrial ensureGuest(HttpServletRequest request, HttpServletResponse response) {
        String guestId = GuestContext.get();
        String ip = clientIp(request);
        GuestTrial trial = guestTrialService.getOrCreate(guestId, ip);

        if (guestId == null || !trial.getGuestId().equals(guestId)) {
            Cookie cookie = new Cookie(GuestTrialFilter.COOKIE_NAME, trial.getGuestId());
            cookie.setPath("/");
            cookie.setHttpOnly(true);
            cookie.setMaxAge(7 * 24 * 60 * 60);
            cookie.setAttribute("SameSite", "Lax");
            response.addCookie(cookie);
            GuestContext.set(trial.getGuestId());
        }
        return trial;
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return (comma > 0 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) return realIp.trim();
        return request.getRemoteAddr();
    }

    private static boolean shouldCountGenerate(Map<String, Object> result) {
        if (result == null) {
            return false;
        }
        Object content = result.get("content");
        if (content == null) {
            return false;
        }
        String text = String.valueOf(content).trim();
        if (text.isBlank()) {
            return false;
        }
        return !text.contains("내용이 부족하여 생성하지 않음");
    }
}
