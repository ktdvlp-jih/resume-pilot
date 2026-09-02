-- 약관·개인정보 동의 시각. 기존 계정은 가입 시각(없으면 NOW)으로 일괄 동의 처리
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;

UPDATE users
SET terms_accepted_at = COALESCE(created_at, NOW()),
    privacy_accepted_at = COALESCE(created_at, NOW())
WHERE terms_accepted_at IS NULL
   OR privacy_accepted_at IS NULL;
