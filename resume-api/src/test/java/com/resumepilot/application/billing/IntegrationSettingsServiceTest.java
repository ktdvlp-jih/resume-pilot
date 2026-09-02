package com.resumepilot.application.billing;

import com.resumepilot.domain.billing.IntegrationConfig;
import com.resumepilot.domain.billing.IntegrationConfigRepository;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.infrastructure.security.LlmSecretsCipher;
import com.resumepilot.presentation.dto.billing.IntegrationSettingItemResponse;
import com.resumepilot.presentation.dto.billing.IntegrationSettingsUpdateRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IntegrationSettingsServiceTest {

    @Mock IntegrationConfigRepository repository;
    @Mock LlmSecretsCipher secretsCipher;
    @InjectMocks IntegrationSettingsService service;

    @BeforeEach
    void stubCipher() {
        lenient().when(secretsCipher.encrypt(anyString())).thenAnswer(inv -> "enc:" + inv.getArgument(0));
        lenient().when(secretsCipher.decrypt(anyString())).thenAnswer(inv -> {
            String v = inv.getArgument(0);
            return v.startsWith("enc:") ? v.substring(4) : v;
        });
        lenient().when(secretsCipher.maskApiKey(anyString())).thenAnswer(inv -> {
            String p = inv.getArgument(0);
            return p.substring(0, Math.min(4, p.length())) + "…" + p.substring(Math.max(0, p.length() - 4));
        });
    }

    @Test
    void getPlainReturnsEmptyWhenMissing() {
        when(repository.findById(IntegrationSettingsService.TOSS_CLIENT_KEY)).thenReturn(Optional.empty());
        assertThat(service.getPlain(IntegrationSettingsService.TOSS_CLIENT_KEY)).isEmpty();
    }

    @Test
    void getPlainDecryptsStoredValue() {
        when(repository.findById(IntegrationSettingsService.TOSS_CLIENT_KEY))
                .thenReturn(Optional.of(IntegrationConfig.builder()
                        .key(IntegrationSettingsService.TOSS_CLIENT_KEY)
                        .valueCiphertext("enc:test_ck_live")
                        .build()));
        assertThat(service.getPlain(IntegrationSettingsService.TOSS_CLIENT_KEY)).isEqualTo("test_ck_live");
    }

    @Test
    void listForAdminMasksSecretAndShowsClientPlain() {
        when(repository.findAllByOrderByKeyAsc()).thenReturn(List.of(
                IntegrationConfig.builder()
                        .key(IntegrationSettingsService.TOSS_CLIENT_KEY)
                        .valueCiphertext("enc:test_ck_abc")
                        .secret(false)
                        .build(),
                IntegrationConfig.builder()
                        .key(IntegrationSettingsService.TOSS_SECRET_KEY)
                        .valueCiphertext("enc:test_sk_secretvalue")
                        .secret(true)
                        .build()
        ));

        List<IntegrationSettingItemResponse> items = service.listForAdmin();
        assertThat(items).hasSize(15);

        IntegrationSettingItemResponse client = items.stream()
                .filter(i -> i.key().equals(IntegrationSettingsService.TOSS_CLIENT_KEY))
                .findFirst().orElseThrow();
        assertThat(client.secret()).isFalse();
        assertThat(client.configured()).isTrue();
        assertThat(client.displayValue()).isEqualTo("test_ck_abc");

        IntegrationSettingItemResponse secret = items.stream()
                .filter(i -> i.key().equals(IntegrationSettingsService.TOSS_SECRET_KEY))
                .findFirst().orElseThrow();
        assertThat(secret.secret()).isTrue();
        assertThat(secret.configured()).isTrue();
        assertThat(secret.displayValue()).contains("…");
        assertThat(secret.displayValue()).doesNotContain("secretvalue");
    }

    @Test
    void updateRejectsUnknownKey() {
        assertThatThrownBy(() -> service.update(new IntegrationSettingsUpdateRequest(
                List.of(new IntegrationSettingsUpdateRequest.Item("UNKNOWN", "x"))
        )))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void updateRejectsEmptyItems() {
        assertThatThrownBy(() -> service.update(new IntegrationSettingsUpdateRequest(List.of())))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void updateDoesNotOverwriteSecretWhenMaskResubmitted() {
        IntegrationConfig existing = IntegrationConfig.builder()
                .key(IntegrationSettingsService.TOSS_SECRET_KEY)
                .valueCiphertext("enc:real_secret_key_value")
                .secret(true)
                .build();
        when(repository.findById(IntegrationSettingsService.TOSS_SECRET_KEY)).thenReturn(Optional.of(existing));
        when(repository.findAllByOrderByKeyAsc()).thenReturn(List.of(existing));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.update(new IntegrationSettingsUpdateRequest(List.of(
                new IntegrationSettingsUpdateRequest.Item(
                        IntegrationSettingsService.TOSS_SECRET_KEY, "real…alue")
        )));

        ArgumentCaptor<IntegrationConfig> captor = ArgumentCaptor.forClass(IntegrationConfig.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getValueCiphertext()).isEqualTo("enc:real_secret_key_value");
        verify(secretsCipher, never()).encrypt(anyString());
    }

    @Test
    void updateEncryptsNewSecret() {
        when(repository.findById(IntegrationSettingsService.TOSS_SECRET_KEY)).thenReturn(Optional.empty());
        when(repository.findAllByOrderByKeyAsc()).thenReturn(List.of());
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.update(new IntegrationSettingsUpdateRequest(List.of(
                new IntegrationSettingsUpdateRequest.Item(
                        IntegrationSettingsService.TOSS_SECRET_KEY, "test_sk_new")
        )));

        ArgumentCaptor<IntegrationConfig> captor = ArgumentCaptor.forClass(IntegrationConfig.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getValueCiphertext()).isEqualTo("enc:test_sk_new");
        assertThat(captor.getValue().isSecret()).isTrue();
    }

    @Test
    void updateClearsBlankValue() {
        IntegrationConfig existing = IntegrationConfig.builder()
                .key(IntegrationSettingsService.TOSS_CLIENT_KEY)
                .valueCiphertext("enc:old")
                .build();
        when(repository.findById(IntegrationSettingsService.TOSS_CLIENT_KEY)).thenReturn(Optional.of(existing));
        when(repository.findAllByOrderByKeyAsc()).thenReturn(List.of(existing));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.update(new IntegrationSettingsUpdateRequest(List.of(
                new IntegrationSettingsUpdateRequest.Item(IntegrationSettingsService.TOSS_CLIENT_KEY, "  ")
        )));

        ArgumentCaptor<IntegrationConfig> captor = ArgumentCaptor.forClass(IntegrationConfig.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getValueCiphertext()).isNull();
    }

    @Test
    void revealSecretReturnsPlainValue() {
        when(repository.findById(IntegrationSettingsService.TOSS_SECRET_KEY))
                .thenReturn(Optional.of(IntegrationConfig.builder()
                        .key(IntegrationSettingsService.TOSS_SECRET_KEY)
                        .valueCiphertext("enc:secret_sk")
                        .secret(true)
                        .build()));

        var revealed = service.revealSecret(IntegrationSettingsService.TOSS_SECRET_KEY);

        assertThat(revealed.key()).isEqualTo(IntegrationSettingsService.TOSS_SECRET_KEY);
        assertThat(revealed.value()).isEqualTo("secret_sk");
    }

    @Test
    void revealSecretRejectsNonSecretKey() {
        assertThatThrownBy(() -> service.revealSecret(IntegrationSettingsService.TOSS_CLIENT_KEY))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }
}
