package com.resumepilot.application.admin;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.resumepilot.domain.experience.ExperienceType;
import com.resumepilot.domain.user.User;
import com.resumepilot.domain.user.UserRepository;
import com.resumepilot.domain.user.UserRole;
import com.resumepilot.presentation.dto.auth.SignupRequest;
import com.resumepilot.presentation.dto.experience.ExperienceCreateRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminUserExperienceIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Test
    void adminCanCreateExperienceForAnotherUser() throws Exception {
        String stamp = UUID.randomUUID().toString().substring(0, 8);
        String adminEmail = "admin-exp-" + stamp + "@example.com";
        String userEmail = "user-exp-" + stamp + "@example.com";

        signup(adminEmail, "Admin Exp");
        signup(userEmail, "User Exp");

        User admin = userRepository.findByEmail(adminEmail).orElseThrow();
        admin.setRole(UserRole.ADMIN);
        userRepository.save(admin);

        String token = login(adminEmail);
        String userId = userRepository.findByEmail(userEmail).orElseThrow().getId().toString();

        mockMvc.perform(post("/api/v1/admin/users/" + userId + "/experiences")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleExperience("교내 공통 API"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("교내 공통 API"));

        mockMvc.perform(get("/api/v1/admin/users/" + userId + "/experiences")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title").value("교내 공통 API"));
    }

    @Test
    void userAdminCanCreateExperienceForRegularUser() throws Exception {
        String stamp = UUID.randomUUID().toString().substring(0, 8);
        String managerEmail = "user-admin-exp-" + stamp + "@example.com";
        String userEmail = "target-exp-" + stamp + "@example.com";

        signup(managerEmail, "User Admin");
        signup(userEmail, "Target User");

        User manager = userRepository.findByEmail(managerEmail).orElseThrow();
        manager.setRole(UserRole.USER_ADMIN);
        userRepository.save(manager);

        String token = login(managerEmail);
        String userId = userRepository.findByEmail(userEmail).orElseThrow().getId().toString();

        mockMvc.perform(post("/api/v1/admin/users/" + userId + "/experiences")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleExperience("매니저가 넣은 경험"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("매니저가 넣은 경험"));
    }

    @Test
    void userAdminCannotCreateExperienceForAdminUser() throws Exception {
        String stamp = UUID.randomUUID().toString().substring(0, 8);
        String managerEmail = "user-admin-block-" + stamp + "@example.com";
        String adminEmail = "admin-target-" + stamp + "@example.com";

        signup(managerEmail, "User Admin");
        signup(adminEmail, "Admin Target");

        User manager = userRepository.findByEmail(managerEmail).orElseThrow();
        manager.setRole(UserRole.USER_ADMIN);
        userRepository.save(manager);

        User admin = userRepository.findByEmail(adminEmail).orElseThrow();
        admin.setRole(UserRole.ADMIN);
        userRepository.save(admin);

        String token = login(managerEmail);
        String adminId = admin.getId().toString();

        mockMvc.perform(post("/api/v1/admin/users/" + adminId + "/experiences")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleExperience("막혀야 함"))))
                .andExpect(status().isForbidden());
    }

    private ExperienceCreateRequest sampleExperience(String title) {
        return new ExperienceCreateRequest(
                ExperienceType.PROJECT,
                title,
                "수업에서 공통 인증 모듈을 만들고 화면 두 개를 그 모듈 위로 옮겼다. 한 화면 수정이 아니라 경계를 정한 일이다.",
                "백엔드 개발",
                null,
                "두 화면이 같은 모듈을 쓰게 되었다.",
                null,
                "팀마다 로그인이 달랐다.",
                "공통 경계를 정한다.",
                "최소 인터페이스만 남겼다.",
                "두 화면이 같은 모듈을 썼다.",
                java.util.List.of("Java"),
                null,
                null
        );
    }

    private void signup(String email, String name) throws Exception {
        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new SignupRequest(email, "password123", name, true, true))));
    }

    private String login(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password123\"}"))
                .andReturn();
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("data").get("accessToken").asText();
    }
}
