package com.resumepilot.application.billing;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class IntegrationSettingsMaskTest {

    @ParameterizedTest
    @ValueSource(strings = {
            "test…cret",
            "abcd...wxyz",
            "***masked",
            "test_sk_****"
    })
    void recognizesMaskedSecretDisplays(String value) {
        assertThat(IntegrationSettingsService.isSecretMaskDisplay(value)).isTrue();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {
            "test_sk_e2e_dummy_secret",
            "  ",
            "plain-value"
    })
    void rejectsNonMaskedValues(String value) {
        assertThat(IntegrationSettingsService.isSecretMaskDisplay(value)).isFalse();
    }

    @Test
    void blankAfterTrimIsNotMask() {
        assertThat(IntegrationSettingsService.isSecretMaskDisplay("   ")).isFalse();
    }
}
