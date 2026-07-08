CREATE TABLE system_settings (
    setting_key   VARCHAR(100) PRIMARY KEY,
    setting_value VARCHAR(500) NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by    UUID REFERENCES users(id)
);

INSERT INTO system_settings (setting_key, setting_value) VALUES
    ('deploy_ai_e2e_enabled', 'true'),
    ('deploy_e2e_enabled', 'true');
