package com.resumepilot.presentation.dto.user;

import com.resumepilot.domain.user.CareerPortfolio;

import java.util.List;

public record CareerPortfolioDto(
        List<CareerItemDto> careers,
        List<EducationItemDto> educations,
        List<CertificationItemDto> certifications,
        List<SkillItemDto> skills,
        String careerStatement,
        CoverLetterSectionsDto coverLetter
) {
    public record CareerItemDto(String company, String position, String startDate, String endDate, String description) {}

    public record EducationItemDto(String school, String major, String degree, String startDate, String endDate, String description) {}

    public record CertificationItemDto(
            String text,
            String name,
            String issuer,
            String issueDate,
            String expiryDate,
            String credentialId,
            String externalCode,
            Boolean matched,
            String matchSource
    ) {}

    public record SkillItemDto(String name, String level, String category) {}

    public record CoverLetterSectionsDto(
            String jobExperience,
            String collaboration,
            String growthValues,
            String personality,
            String motivation
    ) {}

    public static CareerPortfolioDto from(CareerPortfolio portfolio) {
        if (portfolio == null) {
            return empty();
        }
        return new CareerPortfolioDto(
                portfolio.getCareers() == null ? List.of() : portfolio.getCareers().stream()
                        .map(c -> new CareerItemDto(
                                orEmpty(c.getCompany()),
                                orEmpty(c.getPosition()),
                                orEmpty(c.getStartDate()),
                                orEmpty(c.getEndDate()),
                                orEmpty(c.getDescription())))
                        .toList(),
                portfolio.getEducations() == null ? List.of() : portfolio.getEducations().stream()
                        .map(e -> new EducationItemDto(
                                orEmpty(e.getSchool()),
                                orEmpty(e.getMajor()),
                                orEmpty(e.getDegree()),
                                orEmpty(e.getStartDate()),
                                orEmpty(e.getEndDate()),
                                orEmpty(e.getDescription())))
                        .toList(),
                portfolio.getCertifications() == null ? List.of() : portfolio.getCertifications().stream()
                        .map(c -> new CertificationItemDto(
                                orEmpty(displayText(c)),
                                c.getName(),
                                c.getIssuer(),
                                c.getIssueDate(),
                                c.getExpiryDate(),
                                c.getCredentialId(),
                                c.getExternalCode(),
                                c.getMatched(),
                                c.getMatchSource()))
                        .toList(),
                portfolio.getSkills() == null ? List.of() : portfolio.getSkills().stream()
                        .map(s -> new SkillItemDto(
                                orEmpty(s.getName()),
                                orEmpty(s.getLevel()),
                                orEmpty(s.getCategory())))
                        .toList(),
                orEmpty(portfolio.getCareerStatement()),
                fromCoverLetter(portfolio.getCoverLetter())
        );
    }

    public static CareerPortfolioDto empty() {
        return new CareerPortfolioDto(List.of(), List.of(), List.of(), List.of(), "",
                emptyCoverLetter());
    }

    private static CoverLetterSectionsDto emptyCoverLetter() {
        return new CoverLetterSectionsDto("", "", "", "", "");
    }

    private static CoverLetterSectionsDto fromCoverLetter(CareerPortfolio.CoverLetterSections coverLetter) {
        if (coverLetter == null) {
            return emptyCoverLetter();
        }
        return new CoverLetterSectionsDto(
                orEmpty(coverLetter.getJobExperience()),
                orEmpty(coverLetter.getCollaboration()),
                orEmpty(coverLetter.getGrowthValues()),
                orEmpty(coverLetter.getPersonality()),
                orEmpty(coverLetter.getMotivation())
        );
    }

    private static String orEmpty(String value) {
        return value != null ? value : "";
    }

    public CareerPortfolio toEntity() {
        CareerPortfolio portfolio = new CareerPortfolio();
        if (careers != null) {
            portfolio.setCareers(careers.stream()
                    .map(c -> CareerPortfolio.CareerItem.builder()
                            .company(c.company()).position(c.position())
                            .startDate(c.startDate()).endDate(c.endDate()).description(c.description())
                            .build())
                    .toList());
        }
        if (educations != null) {
            portfolio.setEducations(educations.stream()
                    .map(e -> CareerPortfolio.EducationItem.builder()
                            .school(e.school()).major(e.major()).degree(e.degree())
                            .startDate(e.startDate()).endDate(e.endDate()).description(e.description())
                            .build())
                    .toList());
        }
        if (certifications != null) {
            portfolio.setCertifications(certifications.stream()
                    .map(c -> {
                        String text = firstNonBlank(c.text(), c.name());
                        return CareerPortfolio.CertificationItem.builder()
                                .text(text)
                                .name(c.name())
                                .issuer(c.issuer())
                                .issueDate(c.issueDate())
                                .expiryDate(c.expiryDate())
                                .credentialId(c.credentialId())
                                .externalCode(c.externalCode())
                                .matched(c.matched())
                                .matchSource(c.matchSource())
                                .build();
                    })
                    .toList());
        }
        if (skills != null) {
            portfolio.setSkills(skills.stream()
                    .map(s -> CareerPortfolio.SkillItem.builder()
                            .name(s.name()).level(s.level()).category(s.category())
                            .build())
                    .toList());
        }
        portfolio.setCareerStatement(careerStatement);
        if (coverLetter != null) {
            portfolio.setCoverLetter(CareerPortfolio.CoverLetterSections.builder()
                    .jobExperience(coverLetter.jobExperience())
                    .collaboration(coverLetter.collaboration())
                    .growthValues(coverLetter.growthValues())
                    .personality(coverLetter.personality())
                    .motivation(coverLetter.motivation())
                    .build());
        }
        return portfolio;
    }

    private static String displayText(CareerPortfolio.CertificationItem c) {
        return firstNonBlank(c.getText(), c.getName());
    }

    private static String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }
}
