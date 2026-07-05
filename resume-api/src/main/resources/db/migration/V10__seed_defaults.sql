-- Default forbidden expressions
INSERT INTO forbidden_expressions (expression, suggestion, severity) VALUES
('최선을 다하겠습니다', '구체적 목표를 제시하세요', 'WARNING'),
('끊임없이 성장', '성장 경험을 수치로 표현하세요', 'WARNING'),
('열정을 가지고', '해당 열정의 근거 경험을 서술하세요', 'WARNING'),
('성실하게', '성실함을 보여주는 사례를 작성하세요', 'INFO'),
('최고의', '객관적 성과로 대체하세요', 'WARNING');

-- Default prompt templates
INSERT INTO prompt_templates (id, type, name, description) VALUES
('a0000001-0001-0001-0001-000000000001', 'RESUME_GENERATION', '자소서 생성', '기업 맞춤 자소서 생성'),
('a0000001-0001-0001-0001-000000000002', 'JOB_ANALYSIS', '공고 분석', '채용공고 구조화 분석'),
('a0000001-0001-0001-0001-000000000003', 'AI_DETECTION', 'AI 흔적 탐지', 'AI 생성 패턴 탐지'),
('a0000001-0001-0001-0001-000000000004', 'AI_REVIEW', 'AI 첨삭', '문단별 첨삭');

INSERT INTO prompt_versions (id, prompt_template_id, version_number, system_prompt, user_prompt, is_active) VALUES
('b0000001-0001-0001-0001-000000000001', 'a0000001-0001-0001-0001-000000000001', 1,
 'You rewrite cover letters using ONLY user-provided experiences. Never invent new experiences.',
 'Experiences: {{experiences}}\nJob: {{job_analysis}}\nStyle: {{writing_style}}\nRewrite: {{rewrite_level}}%', true),
('b0000001-0001-0001-0001-000000000002', 'a0000001-0001-0001-0001-000000000002', 1,
 'Analyze Korean job postings and extract structured fields.',
 '{{content}}', true),
('b0000001-0001-0001-0001-000000000003', 'a0000001-0001-0001-0001-000000000003', 1,
 'Detect AI-generated patterns in Korean cover letters.',
 '{{content}}', true),
('b0000001-0001-0001-0001-000000000004', 'a0000001-0001-0001-0001-000000000004', 1,
 'Review cover letter paragraphs for company fit.',
 'Content: {{content}}\nJob: {{job_analysis}}', true);

UPDATE prompt_templates SET active_version_id = 'b0000001-0001-0001-0001-000000000001' WHERE id = 'a0000001-0001-0001-0001-000000000001';
UPDATE prompt_templates SET active_version_id = 'b0000001-0001-0001-0001-000000000002' WHERE id = 'a0000001-0001-0001-0001-000000000002';
UPDATE prompt_templates SET active_version_id = 'b0000001-0001-0001-0001-000000000003' WHERE id = 'a0000001-0001-0001-0001-000000000003';
UPDATE prompt_templates SET active_version_id = 'b0000001-0001-0001-0001-000000000004' WHERE id = 'a0000001-0001-0001-0001-000000000004';
