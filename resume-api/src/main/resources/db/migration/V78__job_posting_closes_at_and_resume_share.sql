-- 공통 공고 마감일(공개 캘린더)과 자기소개서 첨삭용 공유 링크.

ALTER TABLE job_postings
    ADD COLUMN closes_at TIMESTAMPTZ;

CREATE INDEX idx_job_postings_shared_closes
    ON job_postings (is_shared, closes_at)
    WHERE is_shared = TRUE;

CREATE TABLE resume_share_links (
    id UUID PRIMARY KEY,
    resume_id UUID NOT NULL REFERENCES resumes (id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_resume_share_links_resume UNIQUE (resume_id),
    CONSTRAINT uk_resume_share_links_token UNIQUE (token)
);

CREATE INDEX idx_resume_share_links_expires
    ON resume_share_links (expires_at);
