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

    public record CertificationItemDto(String name, String issuer, String issueDate, String expiryDate, String credentialId) {}

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
                        .map(c -> new CareerItemDto(c.getCompany(), c.getPosition(), c.getStartDate(), c.getEndDate(), c.getDescription()))
                        .toList(),
                portfolio.getEducations() == null ? List.of() : portfolio.getEducations().stream()
                        .map(e -> new EducationItemDto(e.getSchool(), e.getMajor(), e.getDegree(), e.getStartDate(), e.getEndDate(), e.getDescription()))
                        .toList(),
                portfolio.getCertifications() == null ? List.of() : portfolio.getCertifications().stream()
                        .map(c -> new CertificationItemDto(c.getName(), c.getIssuer(), c.getIssueDate(), c.getExpiryDate(), c.getCredentialId()))
                        .toList(),
                portfolio.getSkills() == null ? List.of() : portfolio.getSkills().stream()
                        .map(s -> new SkillItemDto(s.getName(), s.getLevel(), s.getCategory()))
                        .toList(),
                portfolio.getCareerStatement(),
                portfolio.getCoverLetter() == null ? new CoverLetterSectionsDto(null, null, null, null, null)
                        : new CoverLetterSectionsDto(
                        portfolio.getCoverLetter().getJobExperience(),
                        portfolio.getCoverLetter().getCollaboration(),
                        portfolio.getCoverLetter().getGrowthValues(),
                        portfolio.getCoverLetter().getPersonality(),
                        portfolio.getCoverLetter().getMotivation())
        );
    }

    public static CareerPortfolioDto empty() {
        return new CareerPortfolioDto(List.of(), List.of(), List.of(), List.of(), null,
                new CoverLetterSectionsDto(null, null, null, null, null));
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
                    .map(c -> CareerPortfolio.CertificationItem.builder()
                            .name(c.name()).issuer(c.issuer())
                            .issueDate(c.issueDate()).expiryDate(c.expiryDate()).credentialId(c.credentialId())
                            .build())
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
}
