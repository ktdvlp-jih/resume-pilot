-- JOB_ANALYSIS 프롬프트 v12: pain_points / must_solve 추출 (추정 금지)

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
    'b0000005-0001-0001-0001-000000000007',
    'a0000001-0001-0001-0001-000000000002',
    12,
    $$채용공고를 섹션 단위로 구조화하고, 이 직무가 풀어야 할 문제(pain_points)·입사 직후 기대 업무(must_solve)를 공고 문구에서만 뽑습니다.$$,
    $$- 공고에 없는 정보를 추측·발명하지 마세요.
- 사람인·기업 공고에 흔히 나오는 섹션(주요업무·자격요건·우대·근무조건·복지·채용절차·유의사항)이 있으면 매핑표대로 나누세요. 없는 섹션은 빈 배열([])로 두세요.
- 모집부문 표에 직무가 2개 이상이면 recruitment_sections 배열로 부문별로 분리하세요.
- 섹션 헤더를 기준으로 필드를 정확히 나누세요.
- 동일 bullet·문장을 두 필드 이상에 넣지 마세요(tech_keywords 토큰화는 예외).
- org_culture, work_conditions, benefits, hiring_process, notes, recruitment_sections, pain_points, must_solve 는 반드시 배열입니다.
- pain_points·must_solve는 담당업무·자격요건 등 공고에 있는 문구만 근거로 합니다. 업계 일반론·추정 Pain Point를 넣지 마세요. 근거가 없으면 [].
- 복지·혜택 항목을 org_culture에 넣지 마세요(benefits로).
- JSON만 출력하세요.$$,
    $$[섹션 → 필드 매핑]
| 공고 섹션 | JSON 필드 | 넣을 내용 |
| 모집부문(복수 직무 행) | recruitment_sections | 부문별 {title, job_responsibilities, required_skills, preferred_skills, qualifications, headcount} |
| 주요업무·담당업무·업무내용 | job_responsibilities | bullet 배열 (단일 직무일 때) |
| 지원 자격·자격요건·필수사항 | required_skills / qualifications | 역량·경험은 required_skills, 학력·연수·자격증만 qualifications |
| 우대사항·우대요건 | preferred_skills | bullet 배열 |
| 근무조건·근무형태·급여·근무지·근무시간 | work_conditions | bullet 배열 |
| 복지·복리후생·혜택 | benefits | bullet 배열 |
| 채용절차·전형절차 | hiring_process | bullet 배열 |
| 유의사항 | notes | bullet 배열 |
| 조직문화 | org_culture | bullet 배열 |
| 인재상 | talent_profile | 배열 |
| 소프트 스킬 | core_competencies | 배열 |
| 스택·제품 | tech_keywords | 토큰 배열 |
| 요약 | job_description | 3~5문장 문자열 |
| (파생) | pain_points | 담당업무·자격에서 이 직무가 풀 문제 (동사+대상, 최대 8). 공고에 없으면 [] |
| (파생) | must_solve | 입사 직후 기대 업무를 문제 형태로 재서술 (담당업무 bullet 기반, 새 사실 금지, 최대 8). 없으면 [] |$$,
    $$단일 JSON 객체만 반환하세요.
필수 키: company_name, position, recruitment_sections, qualifications, required_skills, preferred_skills, tech_keywords,
job_responsibilities, talent_profile, core_competencies, org_culture, work_conditions, benefits,
hiring_process, notes, job_description, pain_points, must_solve.
pain_points·must_solve·org_culture·work_conditions·benefits·hiring_process·notes·recruitment_sections 는 문자열 배열(없으면 []).$$,
    $$[Persona]
채용공고를 섹션 단위로 구조화하고, 공고에 근거한 직무 Pain Point·입사 직후 과제를 뽑습니다.

[Guard]
- 공고에 없는 정보를 추측하지 마세요.
- 섹션 헤더로 필드를 분리하세요.
- pain_points·must_solve는 담당업무·자격 문구만 근거. 없으면 [].
- 복지 ≠ 조직문화. 복지/혜택은 benefits.

[Task]
company_name, position, recruitment_sections, qualifications, required_skills, preferred_skills, tech_keywords,
job_responsibilities, talent_profile, core_competencies, org_culture, work_conditions, benefits,
hiring_process, notes, job_description, pain_points, must_solve를 추출합니다.

[Output]
단일 JSON 객체만 반환하세요.$$,
    $$다음 채용공고를 분석하세요.
1) 섹션 헤더를 찾아 매핑표대로 배치하세요.
2) 모집부문 표에 직무가 2개 이상이면 recruitment_sections에 부문별로 넣으세요.
3) 주요업무·자격요건·우대·근무조건·복지·채용절차·유의사항은 공고에 있을 때만 넣고, 없으면 [].
4) pain_points: 담당업무·자격요건에서 "이 직무가 풀어야 할 문제"를 동사+대상으로 최대 8개. 공고에 근거 없으면 [].
5) must_solve: 입사 직후 기대 업무를 담당업무 bullet을 문제 형태로 재서술(새 사실 금지) 최대 8개. 없으면 [].
6) 각 bullet은 하나의 필드에만 넣으세요.
7) 배열 필드는 반드시 JSON 배열로 반환하세요.

{{content}}$$,
    '["content"]'::jsonb,
    true
)
ON CONFLICT (id) DO NOTHING;

UPDATE prompt_versions SET is_active = false
WHERE prompt_template_id = 'a0000001-0001-0001-0001-000000000002'
  AND id <> 'b0000005-0001-0001-0001-000000000007';

UPDATE prompt_versions SET is_active = true
WHERE id = 'b0000005-0001-0001-0001-000000000007';

UPDATE prompt_templates
SET active_version_id = 'b0000005-0001-0001-0001-000000000007', updated_at = NOW()
WHERE id = 'a0000001-0001-0001-0001-000000000002';
