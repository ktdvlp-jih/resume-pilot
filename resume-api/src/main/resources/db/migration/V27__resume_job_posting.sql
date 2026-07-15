ALTER TABLE resumes
    ADD COLUMN job_posting_id UUID REFERENCES job_postings(id) ON DELETE SET NULL;

CREATE INDEX idx_resumes_job_posting_id ON resumes(job_posting_id);
