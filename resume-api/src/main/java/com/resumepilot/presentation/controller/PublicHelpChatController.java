package com.resumepilot.presentation.controller;

import com.resumepilot.application.help.HelpChatService;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.help.HelpChatRequest;
import com.resumepilot.presentation.dto.help.HelpChatResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public")
@RequiredArgsConstructor
@Tag(name = "Public Help Chat")
public class PublicHelpChatController {

    private final HelpChatService helpChatService;

    @PostMapping("/help-chat")
    @Operation(summary = "공개 솔루션 안내 챗봇")
    public ApiResponse<HelpChatResponse> helpChat(
            @Valid @RequestBody HelpChatRequest request,
            HttpServletRequest httpRequest) {
        return ApiResponse.ok(helpChatService.chat(request, clientIp(httpRequest)));
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return (comma > 0 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
