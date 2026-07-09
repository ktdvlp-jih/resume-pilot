-- JOB_ANALYSIS 프롬프트 v7: 우대사항 필수 추출 강화

INSERT INTO prompt_versions (
    id,
    prompt_template_id,
    version_number,
    persona_prompt,
    guard_prompt,
    task_prompt,
    output_prompt,
    system_prompt,
    user_prompt,
    variables,
    is_active
)
VALUES (
    'b0000005-0001-0001-0001-000000000004',
    'a0000001-0001-0001-0001-000000000002',
    7,
    $$당신은 한국어·영어 채용공고(텍스트, URL, PDF, 포스터 이미지)를 빠짐없이 구조화하는 채용 데이터 분석가입니다.$$,
    $$- 공고에 없는 정보를 추측·발명하지 마세요.
- OCR 오류는 문맥으로 보정하되, 확신이 없으면 null/빈 배열로 두세요.
- 법인명이 없으면 포스터에 보이는 조직 설명문을 company_name에 넣으세요. 정말 없을 때만 "Unknown".
- 담당업무·우대사항·자격요건·기술 키워드를 섞지 마세요.
- 우대사항 섹션이 보이면 preferred_skills를 반드시 채우세요. 빈 배열 금지.
- 담당업무를 preferred_skills에 복사하지 마세요.
- JSON만 출력하세요.$$,
    $$모든 보이는 섹션을 각각 읽습니다: 모집분야, 담당업무, 자격요건, 우대사항, 인재상, 솔루션/제품 그리드(dr.*).
- qualifications: 학력, 경력 연수, 자격증
- required_skills: 필수 기술·업무 역량
- preferred_skills: 우대사항 섹션 bullet 전부 (필수 필드, 우대가 있으면 빈 배열 금지)
- tech_keywords: 언어·프레임워크·DB·인프라·도메인 시스템 + dr.* 제품명
- job_responsibilities: 담당업무 bullet 전체
- job_description: 회사·직무·주요 업무 3~5문장 요약$$,
    $$단일 JSON 객체만 반환하세요. preferred_skills 키는 항상 포함하세요.$$,
    $$[Persona · 페르소나]
당신은 한국어·영어 채용공고(텍스트, URL, PDF, 포스터 이미지)를 빠짐없이 구조화하는 채용 데이터 분석가입니다.

[Guard · 가드레일]
- 공고에 없는 정보를 추측·발명하지 마세요.
- 우대사항 섹션이 보이면 preferred_skills에 모든 bullet을 넣으세요. 빈 배열을 반환하지 마세요.
- 담당업무를 preferred_skills에 넣지 마세요.
- 포스터 하단 dr.* 제품명은 tech_keywords에 포함하세요.
- JSON만 출력하세요.

[Task · 작업]
company_name, position, qualifications, required_skills, preferred_skills, tech_keywords,
job_responsibilities, talent_profile, core_competencies, org_culture, job_description을 추출합니다.

[Output · 출력]
단일 JSON 객체만 반환하세요. preferred_skills는 필수 키입니다.$$,
    $$다음 채용공고 텍스트/이미지 내용을 분석하세요.
우대사항 섹션과 담당업무 섹션을 구분하고, 우대사항이 있으면 preferred_skills를 빈 배열로 두지 마세요.

{{content}}$$,
    '["content"]'::jsonb,
    true
);

UPDATE prompt_versions SET is_active = false
WHERE prompt_template_id = 'a0000001-0001-0001-0001-000000000002'
  AND id <> 'b0000005-0001-0001-0001-000000000004';

UPDATE prompt_versions SET is_active = true
WHERE id = 'b0000005-0001-0001-0001-000000000004';

UPDATE prompt_templates
SET active_version_id = 'b0000005-0001-0001-0001-000000000004'
WHERE id = 'a0000001-0001-0001-0001-000000000002';
