package com.resumepilot.presentation.controller;

import com.resumepilot.application.user.UserService;
import com.resumepilot.global.config.SecurityUtils;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.user.UserResponse;
import com.resumepilot.presentation.dto.user.UserUpdateRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "User")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    @Operation(summary = "내 정보 조회")
    public ApiResponse<UserResponse> getMe() {
        return ApiResponse.ok(userService.getMe(SecurityUtils.getCurrentUserId()));
    }

    @PatchMapping("/me")
    @Operation(summary = "내 정보 수정")
    public ApiResponse<UserResponse> updateMe(@Valid @RequestBody UserUpdateRequest request) {
        return ApiResponse.ok(userService.updateMe(SecurityUtils.getCurrentUserId(), request));
    }
}
