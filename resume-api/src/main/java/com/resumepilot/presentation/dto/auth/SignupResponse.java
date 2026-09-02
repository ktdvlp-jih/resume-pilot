package com.resumepilot.presentation.dto.auth;

public record SignupResponse(
        String email,
        boolean requiresEmailVerification,
        String message,
        TokenResponse tokens
) {
    public static SignupResponse pending(String email, String message) {
        return new SignupResponse(email, true, message, null);
    }

    public static SignupResponse verified(TokenResponse tokens) {
        return new SignupResponse(tokens.email(), false, "", tokens);
    }
}
