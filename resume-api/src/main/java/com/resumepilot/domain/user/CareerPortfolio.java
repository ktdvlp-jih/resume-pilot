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
