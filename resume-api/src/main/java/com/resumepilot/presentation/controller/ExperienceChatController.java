package com.resumepilot.presentation.controller;

import com.resumepilot.application.experience.ExperienceChatService;
import com.resumepilot.global.config.SecurityUtils;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.experience.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/experiences/chat")
@RequiredArgsConstructor
@Tag(name = "Experience Chat")
public class ExperienceChatController {

    private final ExperienceChatService experienceChatService;

    @GetMapping("/sessions")
    @Operation(summary = "경험 정리 도우미 세션 목록")
    public ApiResponse<List<ExperienceChatSessionSummaryResponse>> listSessions() {
        return ApiResponse.ok(experienceChatService.listSessions(SecurityUtils.getCurrentUserId()));
    }

    @PostMapping("/sessions")
    @Operation(summary = "새 대화 세션")
    public ApiResponse<ExperienceChatSessionDetailResponse> createSession(
            @RequestBody(required = false) CreateExperienceChatSessionRequest request) {
        return ApiResponse.ok(experienceChatService.createSession(SecurityUtils.getCurrentUserId(), request));
    }

    @GetMapping("/sessions/{id}")
    @Operation(summary = "세션 상세·메시지")
    public ApiResponse<ExperienceChatSessionDetailResponse> getSession(@PathVariable UUID id) {
        return ApiResponse.ok(experienceChatService.getSession(SecurityUtils.getCurrentUserId(), id));
    }

    @PostMapping("/sessions/{id}/messages")
    @Operation(summary = "메시지 전송")
    public ApiResponse<ExperienceChatTurnResponse> sendMessage(
            @PathVariable UUID id,
            @Valid @RequestBody SendExperienceChatMessageRequest request) {
        return ApiResponse.ok(experienceChatService.sendMessage(SecurityUtils.getCurrentUserId(), id, request));
    }

    @PostMapping("/sessions/{id}/apply")
    @Operation(summary = "draft를 경험 라이브러리에 저장")
    public ApiResponse<ApplyExperienceChatDraftResponse> applyDraft(@PathVariable UUID id) {
        return ApiResponse.ok(experienceChatService.applyDraft(SecurityUtils.getCurrentUserId(), id));
    }

    @PostMapping("/sessions/{id}/resume")
    @Operation(summary = "저장된 대화 세션 이어가기")
    public ApiResponse<ExperienceChatSessionDetailResponse> resumeSession(@PathVariable UUID id) {
        return ApiResponse.ok(experienceChatService.resumeSession(SecurityUtils.getCurrentUserId(), id));
    }

    @DeleteMapping("/sessions/{id}")
    @Operation(summary = "세션 삭제")
    public ApiResponse<Void> deleteSession(@PathVariable UUID id) {
        experienceChatService.deleteSession(SecurityUtils.getCurrentUserId(), id);
        return ApiResponse.ok(null);
    }
}
