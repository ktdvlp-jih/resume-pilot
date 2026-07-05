package com.resumepilot.application.resume;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.resumepilot.presentation.dto.auth.SignupRequest;
import com.resumepilot.presentation.dto.auth.TokenResponse;
import com.resumepilot.presentation.dto.experience.ExperienceCreateRequest;
import com.resumepilot.presentation.dto.resume.ResumeCreateRequest;
import com.resumepilot.domain.experience.ExperienceType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class Phase1IntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String accessToken;

    @BeforeEach
    void setUp() throws Exception {
        SignupRequest signup = new SignupRequest("phase1@example.com", "password123", "Phase1 User");
        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signup)));

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"phase1@example.com\",\"password\":\"password123\"}"))
                .andReturn();

        accessToken = objectMapper.readValue(
                loginResult.getResponse().getContentAsString(),
                com.fasterxml.jackson.databind.JsonNode.class
        ).get("data").get("accessToken").asText();
    }

    @Test
    void createExperienceAndResume() throws Exception {
        ExperienceCreateRequest exp = new ExperienceCreateRequest(
                ExperienceType.PROJECT, "Test Project", "Built a system",
                "Backend Developer", null, "Improved performance 30%",
                "30%", null, null, null, null, null, null, null
        );

        mockMvc.perform(post("/api/v1/experiences")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exp)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Test Project"));

        ResumeCreateRequest resume = new ResumeCreateRequest(
                "삼성 지원 자소서", "삼성", "삼성전자 SW 직무", "저는 프로젝트 경험을 바탕으로..."
        );

        mockMvc.perform(post("/api/v1/resumes")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resume)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("삼성 지원 자소서"))
                .andExpect(jsonPath("$.data.latestVersionNumber").value(1));
    }
}
