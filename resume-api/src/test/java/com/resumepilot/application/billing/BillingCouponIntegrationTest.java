package com.resumepilot.application.billing;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.resumepilot.domain.user.User;
import com.resumepilot.domain.user.UserRepository;
import com.resumepilot.domain.user.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BillingCouponIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Test
    void adminGrantAndCouponRedeemAppearInLedger() throws Exception {
        String stamp = UUID.randomUUID().toString().substring(0, 8);
        String adminEmail = "admin-bill-" + stamp + "@example.com";
        String userEmail = "user-bill-" + stamp + "@example.com";

        signup(adminEmail, "Admin Bill");
        signup(userEmail, "User Bill");

        User admin = userRepository.findByEmail(adminEmail).orElseThrow();
        admin.setRole(UserRole.ADMIN);
        userRepository.save(admin);

        String adminToken = login(adminEmail);
        String userToken = login(userEmail);
        String userId = userRepository.findByEmail(userEmail).orElseThrow().getId().toString();

        mockMvc.perform(post("/api/v1/admin/users/" + userId + "/entitlements")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "kind", "TOKEN",
                                "amount", 50,
                                "note", "테스트 관리자 지급"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tokenBalance").value(100));

        mockMvc.perform(get("/api/v1/admin/users/" + userId + "/ledger")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].entryType").value("ADMIN_GRANT"))
                .andExpect(jsonPath("$.data[0].amount").value(50))
                .andExpect(jsonPath("$.data[0].grantedByAdminEmail").value(adminEmail));

        String couponBody = mockMvc.perform(post("/api/v1/admin/billing/coupons")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "kind", "TOKEN",
                                "grantAmount", 30,
                                "maxRedemptions", 1,
                                "note", "테스트 쿠폰"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.code").isNotEmpty())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String couponCode = objectMapper.readTree(couponBody).path("data").path("code").asText();

        mockMvc.perform(post("/api/v1/billing/coupons/redeem")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("code", couponCode))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tokenBalance").value(130));

        mockMvc.perform(get("/api/v1/billing/ledger")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].entryType").value("COUPON_REDEEM"))
                .andExpect(jsonPath("$.data[0].amount").value(30))
                .andExpect(jsonPath("$.data[0].couponCode").value(couponCode));

        mockMvc.perform(post("/api/v1/billing/coupons/redeem")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("code", couponCode))))
                .andExpect(status().isConflict());
    }

    @Test
    void nonAdminCannotAccessCouponAdminEndpoints() throws Exception {
        String stamp = UUID.randomUUID().toString().substring(0, 8);
        String userEmail = "plain-" + stamp + "@example.com";
        signup(userEmail, "Plain User");
        String token = login(userEmail);

        mockMvc.perform(get("/api/v1/admin/billing/coupons")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    private void signup(String email, String name) throws Exception {
        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email,
                                "password", "password123",
                                "name", name
                        ))))
                .andExpect(status().isOk());
    }

    private String login(String email) throws Exception {
        String body = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email,
                                "password", "password123"
                        ))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(body).path("data").path("accessToken").asText();
    }
}
