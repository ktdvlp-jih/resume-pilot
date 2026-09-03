package com.resumepilot.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "Invalid input"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "NOT_FOUND", "Resource not found"),
    CONFLICT(HttpStatus.CONFLICT, "CONFLICT", "Resource conflict"),
    EXPERIENCE_LIMIT_EXCEEDED(HttpStatus.BAD_REQUEST, "EXPERIENCE_LIMIT_EXCEEDED", "Experience library limit exceeded"),
    EXPERIENCE_INSUFFICIENT(HttpStatus.BAD_REQUEST, "EXPERIENCE_INSUFFICIENT", "Selected experiences are too thin for generation"),
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email already registered"),
    EMAIL_NOT_VERIFIED(HttpStatus.BAD_REQUEST, "EMAIL_NOT_VERIFIED", "이메일 인증이 필요합니다"),
    EMAIL_ALREADY_VERIFIED(HttpStatus.CONFLICT, "EMAIL_ALREADY_VERIFIED", "이미 인증된 이메일입니다"),
    OAUTH_NOT_CONFIGURED(HttpStatus.SERVICE_UNAVAILABLE, "OAUTH_NOT_CONFIGURED", "소셜 로그인이 설정되지 않았습니다"),
    OAUTH_EMAIL_REQUIRED(HttpStatus.BAD_REQUEST, "OAUTH_EMAIL_REQUIRED", "소셜 계정에서 이메일을 가져올 수 없습니다"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid email or password"),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "Invalid or expired token"),
    AI_SERVICE_ERROR(HttpStatus.SERVICE_UNAVAILABLE, "AI_SERVICE_ERROR", "AI service unavailable"),
    RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요"),
    INSUFFICIENT_BALANCE(HttpStatus.PAYMENT_REQUIRED, "INSUFFICIENT_BALANCE", "Insufficient token or count balance"),
    PAYMENT_NOT_CONFIGURED(HttpStatus.SERVICE_UNAVAILABLE, "PAYMENT_NOT_CONFIGURED", "Payment is not configured"),
    PAYMENT_AMOUNT_MISMATCH(HttpStatus.BAD_REQUEST, "PAYMENT_AMOUNT_MISMATCH", "Payment amount mismatch"),
    PAYMENT_ALREADY_PROCESSING(HttpStatus.CONFLICT, "PAYMENT_ALREADY_PROCESSING", "Payment already processing"),
    GUEST_TRIAL_LIMIT_EXCEEDED(HttpStatus.LOCKED, "GUEST_TRIAL_LIMIT_EXCEEDED", "체험 횟수를 모두 사용했어요. 가입하면 더 쓸 수 있습니다."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Internal server error");

    private final HttpStatus status;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }
}
