-- Default admin account: login id "admin" / password "admin" (change after first login in production)
INSERT INTO users (email, password_hash, role, enabled)
VALUES (
    'admin',
    '$2b$10$mHN.0s.MpHiUJeo3NQwmne4oLuPTgfng0IB1OIdbb3EaPGtcm4b5.',
    'ADMIN',
    true
)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    role = 'ADMIN',
    enabled = true,
    updated_at = NOW();

INSERT INTO user_profiles (user_id, name)
SELECT id, 'Administrator'
FROM users
WHERE email = 'admin'
ON CONFLICT (user_id) DO NOTHING;
