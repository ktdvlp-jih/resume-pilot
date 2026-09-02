package com.resumepilot.presentation.dto.auth;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 100) String password,
        String name,
        @AssertTrue(message = "서비스 이용약관에 동의해 주세요")
        boolean termsAccepted,
        @AssertTrue(message = "개인정보처리방침에 동의해 주세요")
        boolean privacyAccepted
) {}
