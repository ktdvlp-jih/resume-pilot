-- 마이페이지 경력기술서·자기소개서 섹션 (JSONB)
ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS career_portfolio JSONB NOT NULL DEFAULT '{}'::jsonb;
