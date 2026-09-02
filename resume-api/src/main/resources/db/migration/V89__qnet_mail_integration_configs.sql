-- Q-Net 자격 종목 조회 · 메일 발송 (Admin 연동 설정)
INSERT INTO integration_configs (key, value_ciphertext, is_secret) VALUES
    ('QNET_LOOKUP_ENABLED', NULL, FALSE),
    ('QNET_SERVICE_KEY', NULL, TRUE),
    ('MAIL_PROVIDER', NULL, FALSE),
    ('MAIL_FROM', NULL, FALSE),
    ('RESEND_API_KEY', NULL, TRUE)
ON CONFLICT (key) DO NOTHING;
