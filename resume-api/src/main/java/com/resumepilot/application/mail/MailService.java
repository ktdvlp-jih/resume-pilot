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

import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    private static final String PRODUCT_BLURB =
            "ResumePilot은 공고에 맞는 경험을 골라 주고, 기업 맞춤 자기소개서 작성과 다듬기를 돕는 서비스입니다.";

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
        String subject = "[ResumePilot] 이메일 인증을 완료해 주세요";
        String text = """
                안녕하세요, ResumePilot입니다.

                %s

                방금 이 이메일 주소로 회원가입 요청이 접수되었습니다.
                아래 링크를 열어 이메일 소유 여부를 확인해 주세요.
                (링크는 일정 시간 후 만료됩니다.)

                %s

                인증을 마치시면 로그인 후 경험 정리·공고 분석·자기소개서 작성을 바로 시작할 수 있습니다.

                본인이 가입하지 않았다면 이 메일을 무시하셔도 됩니다. 계정은 인증 전까지 사용할 수 없습니다.
                """.formatted(PRODUCT_BLURB, verifyUrl);
        String body = """
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1a1a1a;">안녕하세요, <strong>ResumePilot</strong>입니다.</p>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#444;">%s</p>
                <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#1a1a1a;"><strong>회원가입 요청이 접수되었습니다.</strong></p>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#444;">아래 버튼을 눌러 이메일 소유 여부를 확인해 주세요. 인증을 마치면 경험 정리·공고 분석·자기소개서 작성을 바로 시작할 수 있습니다.</p>
                %s
                <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#888;">본인이 가입하지 않았다면 이 메일을 무시하셔도 됩니다. 계정은 인증 전까지 사용할 수 없습니다.<br>링크는 일정 시간 후 만료됩니다.</p>
                """.formatted(escapeHtml(PRODUCT_BLURB), ctaBlock(verifyUrl, "이메일 인증하기"));
        send(to, subject, text, wrapHtml("이메일 인증", body), verifyUrl);
    }

    public void sendOAuthLinkEmail(String to, String linkUrl) {
        sendOAuthLinkEmail(to, linkUrl, null);
    }

    public void sendOAuthLinkEmail(String to, String linkUrl, String oauthProvider) {
        String providerLabel = displayProvider(oauthProvider);
        String subject = "[ResumePilot] " + providerLabel + " 소셜 로그인 연결 확인";
        String text = """
                안녕하세요, ResumePilot입니다.

                %s

                지금 %s 소셜 로그인으로 「기존 ResumePilot 계정과 연결」 요청이 들어왔습니다.
                계정을 연결하면 앞으로 %s로도 같은 계정에 로그인할 수 있습니다.

                본인이 요청한 것이 맞다면 아래 링크를 열어 연결을 확인해 주세요.
                (링크는 일정 시간 후 만료됩니다.)

                %s

                본인이 요청하지 않았다면 이 메일을 무시해 주세요. 연결은 확인 전까지 완료되지 않습니다.
                """.formatted(PRODUCT_BLURB, providerLabel, providerLabel, linkUrl);
        String body = """
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1a1a1a;">안녕하세요, <strong>ResumePilot</strong>입니다.</p>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#444;">%s</p>
                <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#1a1a1a;"><strong>%s 소셜 로그인 연결 요청이 도착했습니다.</strong></p>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#444;">기존 ResumePilot 계정에 %s 로그인을 연결하려는 요청입니다. 연결을 마치면 앞으로 %s로도 같은 계정에 로그인할 수 있습니다. 본인이 요청한 것이 맞다면 아래 버튼을 눌러 확인해 주세요.</p>
                %s
                <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#888;">본인이 요청하지 않았다면 이 메일을 무시해 주세요. 연결은 확인 전까지 완료되지 않습니다.<br>링크는 일정 시간 후 만료됩니다.</p>
                """.formatted(
                escapeHtml(PRODUCT_BLURB),
                escapeHtml(providerLabel),
                escapeHtml(providerLabel),
                escapeHtml(providerLabel),
                ctaBlock(linkUrl, "계정 연결 확인"));
        send(to, subject, text, wrapHtml("소셜 로그인 연결", body), linkUrl);
    }

    private static String displayProvider(String oauthProvider) {
        if (oauthProvider == null || oauthProvider.isBlank()) {
            return "소셜";
        }
        return switch (oauthProvider.trim().toLowerCase(Locale.ROOT)) {
            case "google" -> "Google";
            case "kakao" -> "카카오";
            default -> oauthProvider.trim();
        };
    }

    private static String ctaBlock(String url, String label) {
        String safeUrl = escapeHtml(url);
        String safeLabel = escapeHtml(label);
        return """
                <p style="margin:0 0 12px;">
                  <a href="%s" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#6d28d9;color:#fff;font-size:14px;font-weight:600;text-decoration:none;">%s</a>
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#888;">버튼이 열리지 않으면 아래 주소를 복사해 브라우저에 붙여 넣으세요.<br><span style="word-break:break-all;color:#555;">%s</span></p>
                """.formatted(safeUrl, safeLabel, safeUrl);
    }

    private static String wrapHtml(String eyebrow, String bodyHtml) {
        return """
                <div style="margin:0;padding:24px 16px;background:#f6f4fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ebe6f5;">
                    <div style="padding:20px 24px;background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#fff;">
                      <div style="font-size:12px;opacity:.85;letter-spacing:.02em;">%s</div>
                      <div style="margin-top:4px;font-size:20px;font-weight:700;">ResumePilot</div>
                    </div>
                    <div style="padding:28px 24px;">%s</div>
                    <div style="padding:14px 24px 20px;border-top:1px solid #f0ecf7;font-size:11px;line-height:1.5;color:#999;">이 메일은 ResumePilot 서비스 안내에 따라 발송되었습니다.</div>
                  </div>
                </div>
                """.formatted(escapeHtml(eyebrow), bodyHtml);
    }

    private static String escapeHtml(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
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
            log.info("Resend mail sent to {}", to);
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
