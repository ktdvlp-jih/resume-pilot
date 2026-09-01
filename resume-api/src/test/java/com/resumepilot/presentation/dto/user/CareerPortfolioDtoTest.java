package com.resumepilot.presentation.dto.user;

import com.resumepilot.domain.user.CareerPortfolio;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CareerPortfolioDtoTest {

    @Test
    void emptyUsesBlankStringsNotNull() {
        CareerPortfolioDto dto = CareerPortfolioDto.empty();

        assertThat(dto.careerStatement()).isEmpty();
        assertThat(dto.coverLetter()).isNotNull();
        assertThat(dto.coverLetter().jobExperience()).isEmpty();
        assertThat(dto.coverLetter().collaboration()).isEmpty();
        assertThat(dto.coverLetter().growthValues()).isEmpty();
        assertThat(dto.coverLetter().personality()).isEmpty();
        assertThat(dto.coverLetter().motivation()).isEmpty();
        assertThat(dto.careers()).isEmpty();
        assertThat(dto.educations()).isEmpty();
        assertThat(dto.certifications()).isEmpty();
        assertThat(dto.skills()).isEmpty();
    }

    @Test
    void fromNormalizesNullCoverLetterFields() {
        CareerPortfolio portfolio = CareerPortfolio.builder()
                .careerStatement(null)
                .coverLetter(CareerPortfolio.CoverLetterSections.builder()
                        .jobExperience(null)
                        .collaboration("협업")
                        .build())
                .build();

        CareerPortfolioDto dto = CareerPortfolioDto.from(portfolio);

        assertThat(dto.careerStatement()).isEmpty();
        assertThat(dto.coverLetter().jobExperience()).isEmpty();
        assertThat(dto.coverLetter().collaboration()).isEqualTo("협업");
        assertThat(dto.coverLetter().growthValues()).isEmpty();
    }
}
