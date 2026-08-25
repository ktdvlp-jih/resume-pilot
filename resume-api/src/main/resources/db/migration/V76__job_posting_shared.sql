-- 로그인 사용자 전원이 조회·작성에 쓸 수 있는 공통 공고.
-- 다른 사용자의 비공개 공고는 그대로 숨긴다.

ALTER TABLE job_postings
    ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_job_postings_shared
    ON job_postings (is_shared)
    WHERE is_shared = TRUE;
