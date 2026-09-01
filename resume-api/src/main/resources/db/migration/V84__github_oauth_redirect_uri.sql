INSERT INTO integration_configs (key, value_ciphertext, is_secret) VALUES
('GITHUB_OAUTH_REDIRECT_URI', NULL, FALSE)
ON CONFLICT (key) DO NOTHING;
