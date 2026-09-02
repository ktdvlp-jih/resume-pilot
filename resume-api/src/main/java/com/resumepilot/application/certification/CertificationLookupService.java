package com.resumepilot.application.certification;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.resumepilot.application.billing.IntegrationSettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicReference;

/**
 * 국가자격 종목 목록(Q-Net OpenAPI)으로 자유 입력 텍스트가 실제 자격 종목인지 조회한다.
 * 개인 취득 여부 검증 API는 공개되지 않으므로, 종목명 매칭·메타 보강만 수행한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CertificationLookupService {

    private static final String SOURCE_QNET = "QNET";
    private static final Duration CACHE_TTL = Duration.ofHours(12);

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;
    private final IntegrationSettingsService integrationSettings;

    @Value("${app.certification.qnet.enabled:false}")
    private boolean enabledEnv;

    @Value("${app.certification.qnet.service-key:}")
    private String serviceKeyEnv;

    @Value("${app.certification.qnet.base-url:http://openapi.q-net.or.kr/api/service/rest/InquiryListNationalQualifcationSVC/getList}")
    private String baseUrl;

    private final AtomicReference<CachedCatalog> cache = new AtomicReference<>();

    public boolean isConfigured() {
        String serviceKey = resolveServiceKey();
        return resolveEnabled() && serviceKey != null && !serviceKey.isBlank();
    }

    private boolean resolveEnabled() {
        String fromDb = integrationSettings.getPlain(IntegrationSettingsService.QNET_LOOKUP_ENABLED);
        if (fromDb != null && !fromDb.isBlank()) {
            String v = fromDb.trim();
            return "true".equalsIgnoreCase(v) || "1".equals(v) || "yes".equalsIgnoreCase(v);
        }
        return enabledEnv;
    }

    private String resolveServiceKey() {
        String fromDb = integrationSettings.getPlain(IntegrationSettingsService.QNET_SERVICE_KEY);
        if (fromDb != null && !fromDb.isBlank()) {
            return fromDb.trim();
        }
        return serviceKeyEnv == null ? "" : serviceKeyEnv.trim();
    }

    public LookupResponse lookup(String query) {
        String q = query == null ? "" : query.trim();
        if (q.isBlank()) {
            return LookupResponse.unavailable(false, "검색어가 비어 있습니다.");
        }
        if (!isConfigured()) {
            return LookupResponse.unavailable(false,
                    "자격 종목 외부 API가 설정되지 않았습니다. QNET_SERVICE_KEY를 설정하세요.");
        }

        List<CatalogItem> catalog;
        try {
            catalog = loadCatalog();
        } catch (Exception e) {
            log.warn("Q-Net catalog fetch failed: {}", e.getMessage());
            return LookupResponse.unavailable(true, "외부 자격 종목 API 호출에 실패했습니다.");
        }

        String needle = normalize(q);
        List<Match> matches = catalog.stream()
                .filter(item -> normalize(item.name()).contains(needle) || needle.contains(normalize(item.name())))
                .sorted(Comparator.comparingInt((CatalogItem item) -> normalize(item.name()).length()))
                .limit(30)
                .map(item -> new Match(
                        item.name(),
                        item.seriesName(),
                        item.qualTypeName(),
                        "한국산업인력공단",
                        item.code(),
                        SOURCE_QNET,
                        score(needle, normalize(item.name()))
                ))
                .sorted(Comparator.comparingDouble(Match::score).reversed())
                .limit(20)
                .toList();

        return new LookupResponse(true, true, null, matches);
    }

    private List<CatalogItem> loadCatalog() {
        CachedCatalog cached = cache.get();
        if (cached != null && Instant.now().isBefore(cached.expiresAt())) {
            return cached.items();
        }
        synchronized (this) {
            cached = cache.get();
            if (cached != null && Instant.now().isBefore(cached.expiresAt())) {
                return cached.items();
            }
            List<CatalogItem> fresh = fetchCatalog();
            cache.set(new CachedCatalog(fresh, Instant.now().plus(CACHE_TTL)));
            return fresh;
        }
    }

    private List<CatalogItem> fetchCatalog() {
        String uri = UriComponentsBuilder
                .fromUriString(baseUrl)
                .queryParam("serviceKey", resolveServiceKey())
                .queryParam("_type", "json")
                .encode()
                .build()
                .toUriString();

        String body = webClientBuilder.build()
                .get()
                .uri(uri)
                .retrieve()
                .bodyToMono(String.class)
                .block(Duration.ofSeconds(20));

        if (body == null || body.isBlank()) {
            throw new IllegalStateException("empty Q-Net response");
        }

        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode items = root.path("response").path("body").path("items").path("item");
            List<CatalogItem> list = new ArrayList<>();
            if (items.isArray()) {
                for (JsonNode n : items) {
                    addItem(list, n);
                }
            } else if (items.isObject()) {
                addItem(list, items);
            }
            if (list.isEmpty()) {
                String code = root.path("response").path("header").path("resultCode").asText("");
                String msg = root.path("response").path("header").path("resultMsg").asText("");
                throw new IllegalStateException("Q-Net empty items resultCode=" + code + " msg=" + msg);
            }
            return list;
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Q-Net parse failed: " + e.getMessage(), e);
        }
    }

    private static void addItem(List<CatalogItem> list, JsonNode n) {
        String name = text(n, "jmfldnm");
        if (name == null || name.isBlank()) return;
        list.add(new CatalogItem(
                name.trim(),
                text(n, "jmcd"),
                text(n, "seriesnm"),
                text(n, "qualgbnm")
        ));
    }

    private static String text(JsonNode n, String field) {
        JsonNode v = n.get(field);
        return v == null || v.isNull() ? null : v.asText();
    }

    private static String normalize(String s) {
        return s.toLowerCase(Locale.ROOT).replaceAll("\\s+", "");
    }

    private static double score(String needle, String name) {
        if (name.equals(needle)) return 1.0;
        if (name.startsWith(needle) || needle.startsWith(name)) return 0.9;
        if (name.contains(needle)) return 0.75;
        return 0.5;
    }

    private record CatalogItem(String name, String code, String seriesName, String qualTypeName) {}

    private record CachedCatalog(List<CatalogItem> items, Instant expiresAt) {}

    public record Match(
            String name,
            String seriesName,
            String qualTypeName,
            String issuer,
            String externalCode,
            String matchSource,
            double score
    ) {}

    public record LookupResponse(
            boolean configured,
            boolean success,
            String message,
            List<Match> matches
    ) {
        static LookupResponse unavailable(boolean configured, String message) {
            return new LookupResponse(configured, false, message, List.of());
        }
    }
}
