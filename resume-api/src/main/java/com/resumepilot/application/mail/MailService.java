package com.resumepilot.application.mail;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.resumepilot.application.billing.IntegrationSettingsService;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;
    private final IntegrationSettingsService integrationSettings;

    @Value("${mail.provider:log}")
    private String providerEnv;

    @Value("${mail.from:onboarding@resend.dev}")
    private String fromEnv;

    @Value("${RESEND_API_KEY:}")
    private String resendApiKeyEnv;

    @Getter
    private volatile String lastLoggedVerifyUrl;

    public void sendVerificationEmail(String to, String verifyUrl) {
        String subject = "ResumePilot 이메일 인증";
        String text = """
                ResumePilot 가입을 환영합니다.

                아래 링크를 열어 이메일 인증을 완료해 주세요.
                (링크는 일정 시간 후 만료됩니다.)

                %s

                본인이 가입하지 않았다면 이 메일을 무시해 주세요.
                """.formatted(verifyUrl);
        String html = """
                <p>ResumePilot 가입을 환영합니다.</p>
                <p>아래 버튼을 눌러 이메일 인증을 완료해 주세요.</p>
                <p><a href="%s">이메일 인증하기</a></p>
                <p style="color:#666;font-size:12px;">링크가 열리지 않으면 주소를 복사해 브라우저에 붙여 넣으세요.<br>%s</p>
                """.formatted(verifyUrl, verifyUrl);
        send(to, subject, text, html, verifyUrl);
    }

    public void sendOAuthLinkEmail(String to, String linkUrl) {
        String subject = "ResumePilot 계정 연결 확인";
        String text = """
                소셜 로그인을 기존 계정에 연결하려면 아래 링크를 열어 주세요.
                (링크는 일정 시간 후 만료됩니다.)

                %s

                본인이 요청하지 않았다면 이 메일을 무시해 주세요.
                """.formatted(linkUrl);
        String html = """
                <p>소셜 로그인을 기존 계정에 연결하려면 아래 버튼을 눌러 주세요.</p>
                <p><a href="%s">계정 연결 확인</a></p>
                <p style="color:#666;font-size:12px;">링크가 열리지 않으면 주소를 복사해 브라우저에 붙여 넣으세요.<br>%s</p>
                """.formatted(linkUrl, linkUrl);
        send(to, subject, text, html, linkUrl);
    }

    private void send(String to, String subject, String text, String html, String logUrl) {
        String provider = resolveProvider();
        String resendApiKey = resolveResendApiKey();
        if ("resend".equalsIgnoreCase(provider) && resendApiKey != null && !resendApiKey.isBlank()) {
            sendViaResend(to, subject, text, html, resendApiKey);
            return;
        }
        lastLoggedVerifyUrl = logUrl;
        log.info("[mail:log] to={} subject={} url={}", to, subject, logUrl);
    }

    private void sendViaResend(String to, String subject, String text, String html, String resendApiKey) {
        try {
            String body = objectMapper.writeValueAsString(Map.of(
                    "from", resolveFrom(),
                    "to", new String[]{to},
                    "subject", subject,
                    "text", text,
                    "html", html
            ));
            webClientBuilder.build()
                    .post()
                    .uri("https://api.resend.com/emails")
                    .header("Authorization", "Bearer " + resendApiKey.trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            log.info("Resend verification email sent to {}", to);
        } catch (WebClientResponseException ex) {
            log.warn("Resend mail failed: {} {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "인증 메일 발송에 실패했습니다");
        } catch (Exception e) {
            log.warn("Resend mail error: {}", e.getMessage());
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "인증 메일 발송 중 오류가 발생했습니다");
        }
    }

    private String resolveProvider() {
        return firstConfigured(IntegrationSettingsService.MAIL_PROVIDER, providerEnv);
    }

    private String resolveFrom() {
        return firstConfigured(IntegrationSettingsService.MAIL_FROM, fromEnv);
    }

    private String resolveResendApiKey() {
        return firstConfigured(IntegrationSettingsService.RESEND_API_KEY, resendApiKeyEnv);
    }

    private String firstConfigured(String dbKey, String envFallback) {
        String fromDb = integrationSettings.getPlain(dbKey);
        if (fromDb != null && !fromDb.isBlank()) {
            return fromDb.trim();
        }
        return envFallback == null ? "" : envFallback.trim();
    }
}
