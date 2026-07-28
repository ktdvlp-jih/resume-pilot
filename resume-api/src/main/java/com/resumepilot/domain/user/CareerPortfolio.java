package com.resumepilot.domain.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CareerPortfolio {

    @Builder.Default
    private List<CareerItem> careers = new ArrayList<>();

    @Builder.Default
    private List<EducationItem> educations = new ArrayList<>();

    @Builder.Default
    private List<CertificationItem> certifications = new ArrayList<>();

    @Builder.Default
    private List<SkillItem> skills = new ArrayList<>();

    private String careerStatement;

    @Builder.Default
    private CoverLetterSections coverLetter = new CoverLetterSections();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CareerItem {
        private String company;
        private String position;
        private String startDate;
        private String endDate;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EducationItem {
        private String school;
        private String major;
        private String degree;
        private String startDate;
        private String endDate;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CertificationItem {
        /** 사용자가 자유롭게 입력한 자격증 텍스트 (주 입력) */
        private String text;
        /** 외부 종목 API 등으로 보강된 공식 자격명 (선택) */
        private String name;
        private String issuer;
        private String issueDate;
        private String expiryDate;
        private String credentialId;
        /** Q-Net 등 외부 종목 코드 */
        private String externalCode;
        /** 공식 종목 목록과 매칭됐는지 */
        private Boolean matched;
        /** 매칭 출처 (예: QNET) */
        private String matchSource;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SkillItem {
        private String name;
        private String level;
        private String category;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CoverLetterSections {
        private String jobExperience;
        private String collaboration;
        private String growthValues;
        private String personality;
        private String motivation;
    }
}
