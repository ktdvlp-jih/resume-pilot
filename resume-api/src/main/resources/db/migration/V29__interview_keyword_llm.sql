-- 예상 면접 질문(INTERVIEW_QUESTIONS)·키워드 비교(KEYWORD_COMPARE)를
-- 규칙 기반 템플릿에서 LLM 호출 기반으로 전환한다.
-- 프롬프트 템플릿 2종과 LLM 라우트(AI_REVIEW 라우트 체인 복제)를 추가한다.
-- 수동 선적용을 허용하기 위해 모든 INSERT는 idempotent 하게 작성한다.

-- 1) 프롬프트 템플릿 (active_version_id는 버전 생성 후 연결)
INSERT INTO prompt_templates (id, type, name, description)
VALUES (
    'a0000001-0001-0001-0001-000000000005',
    'INTERVIEW_QUESTIONS',
    '예상 면접 질문',
    '자기소개서 내용을 근거로 예상 면접 질문을 생성'
)
ON CONFLICT (type) DO NOTHING;

INSERT INTO prompt_templates (id, type, name, description)
VALUES (
    'a0000001-0001-0001-0001-000000000006',
    'KEYWORD_COMPARE',
    '키워드 비교',
    '채용공고 키워드가 자기소개서에 반영됐는지 의미 기반 비교'
)
ON CONFLICT (type) DO NOTHING;

-- 2) 프롬프트 버전
INSERT INTO prompt_versions (
    id, prompt_template_id, version_number,
    persona_prompt, guard_prompt, task_prompt, output_prompt,
    system_prompt, user_prompt, variables, is_active
)
VALUES (
    'b0000001-0001-0001-0001-000000000005',
    'a0000001-0001-0001-0001-000000000005',
    1,
    $$당신은 지원자의 자기소개서를 검토하고 실전 면접 질문을 준비하는 기술·인사 면접관입니다.$$,
    $$- 자기소개서에 실제로 언급된 경험·기술·성과만 근거로 질문하세요.
- 자기소개서에 없는 내용을 가정한 질문을 만들지 마세요.
- 답변을 유도하거나 평가하지 말고 질문만 생성하세요.$$,
    $$자기소개서 내용을 근거로 예상 면접 질문 6~8개를 생성합니다.
지원동기·협업·갈등 해결·성과·프로젝트·기술·심화·압박 카테고리를 골고루 활용하되,
자기소개서에서 근거를 찾을 수 있는 카테고리만 사용하세요.
각 질문은 자기소개서의 구체적 내용(프로젝트명, 기술, 성과 수치 등)을 직접 인용해 실전처럼 작성하세요.$$,
    $$JSON 배열만 반환하세요. 각 항목:
- category: "지원동기" | "협업" | "갈등 해결" | "성과" | "프로젝트" | "기술" | "심화" | "압박"
- question: 실전 면접 질문 (한국어, 자기소개서 내용 인용)
- difficulty: "EASY" | "NORMAL" | "HARD"$$,
    $$[Persona · 페르소나]
당신은 지원자의 자기소개서를 검토하고 실전 면접 질문을 준비하는 기술·인사 면접관입니다.

[Guard · 가드레일]
- 자기소개서에 실제로 언급된 경험·기술·성과만 근거로 질문하세요.
- 자기소개서에 없는 내용을 가정한 질문을 만들지 마세요.
- 답변을 유도하거나 평가하지 말고 질문만 생성하세요.

[Task · 작업]
자기소개서 내용을 근거로 예상 면접 질문 6~8개를 생성합니다.
각 질문은 자기소개서의 구체적 내용(프로젝트명, 기술, 성과 수치 등)을 직접 인용해 실전처럼 작성하세요.

[Output · 출력]
JSON 배열만 반환하세요. 각 항목:
{ "category": "지원동기|협업|갈등 해결|성과|프로젝트|기술|심화|압박", "question": "...", "difficulty": "EASY|NORMAL|HARD" }$$,
    $$[자기소개서]
{{content}}$$,
    '["content"]'::jsonb,
    true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO prompt_versions (
    id, prompt_template_id, version_number,
    persona_prompt, guard_prompt, task_prompt, output_prompt,
    system_prompt, user_prompt, variables, is_active
)
VALUES (
    'b0000001-0001-0001-0001-000000000006',
    'a0000001-0001-0001-0001-000000000006',
    1,
    $$당신은 채용공고 요구 키워드가 자기소개서에 얼마나 반영됐는지 분석하는 키워드 매칭 분석가입니다.$$,
    $$- 단순 문자열 포함이 아니라 의미 기반으로 판단하세요 (예: "Spring Boot 백엔드 설계" 경험은 "spring" 키워드 매칭).
- 자기소개서에 근거가 없는 키워드를 matched에 넣지 마세요.
- recommended는 missing 중 자기소개서 문맥에 자연스럽게 추가할 수 있는 것만 고르세요.$$,
    $$채용공고 키워드 목록과 자기소개서를 비교하여
매칭된 키워드(matched), 누락된 키워드(missing), 추가 반영을 추천하는 키워드(recommended),
과도하게 반복 사용된 키워드(overused)를 분류합니다.$$,
    $$JSON 객체만 반환하세요. 형식:
{ "matched": string[], "missing": string[], "recommended": string[], "overused": string[] }
각 배열 원소는 입력된 공고 키워드 원문 그대로 사용하세요.$$,
    $$[Persona · 페르소나]
당신은 채용공고 요구 키워드가 자기소개서에 얼마나 반영됐는지 분석하는 키워드 매칭 분석가입니다.

[Guard · 가드레일]
- 단순 문자열 포함이 아니라 의미 기반으로 판단하세요.
- 자기소개서에 근거가 없는 키워드를 matched에 넣지 마세요.
- recommended는 missing 중 자기소개서 문맥에 자연스럽게 추가할 수 있는 것만 고르세요.

[Task · 작업]
채용공고 키워드 목록과 자기소개서를 비교하여 matched / missing / recommended / overused로 분류합니다.

[Output · 출력]
JSON 객체만 반환하세요:
{ "matched": string[], "missing": string[], "recommended": string[], "overused": string[] }
각 배열 원소는 입력된 공고 키워드 원문 그대로 사용하세요.$$,
    $$[공고 키워드]
{{job_keywords}}

[자기소개서]
{{resume_content}}$$,
    '["job_keywords", "resume_content"]'::jsonb,
    true
)
ON CONFLICT (id) DO NOTHING;

-- 3) 템플릿에 활성 버전 연결
UPDATE prompt_templates
SET active_version_id = 'b0000001-0001-0001-0001-000000000005', updated_at = NOW()
WHERE type = 'INTERVIEW_QUESTIONS' AND active_version_id IS NULL;

UPDATE prompt_templates
SET active_version_id = 'b0000001-0001-0001-0001-000000000006', updated_at = NOW()
WHERE type = 'KEYWORD_COMPARE' AND active_version_id IS NULL;

-- 4) LLM 라우트: AI_REVIEW 라우트 체인을 새 operation 2개에 복제
INSERT INTO llm_model_routes (operation, provider_id, model_name, priority, enabled)
SELECT 'INTERVIEW_QUESTIONS', provider_id, model_name, priority, enabled
FROM llm_model_routes
WHERE operation = 'AI_REVIEW'
ON CONFLICT (operation, priority) DO NOTHING;

INSERT INTO llm_model_routes (operation, provider_id, model_name, priority, enabled)
SELECT 'KEYWORD_COMPARE', provider_id, model_name, priority, enabled
FROM llm_model_routes
WHERE operation = 'AI_REVIEW'
ON CONFLICT (operation, priority) DO NOTHING;
