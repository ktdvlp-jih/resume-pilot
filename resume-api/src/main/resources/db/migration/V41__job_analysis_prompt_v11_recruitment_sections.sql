-- JOB_ANALYSIS 프롬프트 v11: 복수 모집부문(recruitment_sections) 분리

UPDATE prompt_versions
SET
    guard_prompt = $$- 공고에 없는 정보를 추측·발명하지 마세요.
- 사람인·기업 공고에 흔히 나오는 섹션(주요업무·자격요건·우대·근무조건·복지·채용절차·유의사항)이 있으면 매핑표대로 나누세요. 모든 공고에 전부 있는 것은 아니므로, 없는 섹션은 빈 배열([])로 두세요.
- 모집부문 표에 직무가 2개 이상이면 recruitment_sections 배열로 부문별로 분리하세요. 서로 다른 부문의 담당업무·자격·우대를 한 덩어리로 합치지 마세요.
- 섹션 헤더를 기준으로 필드를 정확히 나누세요.
- 동일 bullet·문장을 두 필드 이상에 넣지 마세요(tech_keywords 토큰화는 예외).
- org_culture, work_conditions, benefits, hiring_process, notes, recruitment_sections 는 반드시 배열입니다.
- 복지·혜택 항목을 org_culture에 넣지 마세요(benefits로).
- 근무형태·급여·근무지·근무시간은 work_conditions로.
- JSON만 출력하세요.$$,
    task_prompt = $$[섹션 → 필드 매핑]
| 공고 섹션 | JSON 필드 | 넣을 내용 |
| 모집부문(복수 직무 행) | recruitment_sections | 부문별 {title, job_responsibilities, required_skills, preferred_skills, qualifications, headcount} |
| 주요업무·담당업무·업무내용 | job_responsibilities | bullet 배열 (단일 직무일 때) |
| 지원 자격·자격요건·필수사항 | required_skills / qualifications | 역량·경험은 required_skills, 학력·연수·자격증만 qualifications |
| 우대사항·우대요건 | preferred_skills | bullet 배열 |
| 근무조건·근무형태·급여·근무지·근무시간 | work_conditions | bullet 배열 |
| 복지·복리후생·혜택 | benefits | bullet 배열 (한 줄씩) |
| 채용절차·전형절차 | hiring_process | bullet 배열 |
| 유의사항·지원 유의사항 | notes | bullet 배열 |
| 조직문화·문화 (복지 아님) | org_culture | bullet 배열 |
| 인재상 | talent_profile | 배열 |
| 소프트 스킬 | core_competencies | 배열 |
| 스택·제품 | tech_keywords | 토큰 배열 |
| 요약 | job_description | 3~5문장 문자열 |$$,
    output_prompt = $$단일 JSON 객체만 반환하세요.
필수 키: company_name, position, recruitment_sections, qualifications, required_skills, preferred_skills, tech_keywords,
job_responsibilities, talent_profile, core_competencies, org_culture, work_conditions, benefits,
hiring_process, notes, job_description.
recruitment_sections 는 모집부문이 2개 이상일 때 부문별 객체 배열(없으면 []).
org_culture·work_conditions·benefits·hiring_process·notes 는 문자열 배열(없으면 []).$$,
    system_prompt = $$[Persona]
채용공고를 섹션 단위로 구조화합니다. 복수 모집부문은 부문별로 분리합니다.

[Guard]
- 섹션 헤더로 필드를 분리하세요.
- 모집부문이 여러 개면 recruitment_sections로 나누세요.
- 복지 항목 ≠ 조직문화. 복지/혜택은 benefits.
- 근무조건은 work_conditions.
- 채용절차는 hiring_process, 유의사항은 notes.
- org_culture 등은 반드시 배열.

[Task]
company_name, position, recruitment_sections, qualifications, required_skills, preferred_skills, tech_keywords,
job_responsibilities, talent_profile, core_competencies, org_culture, work_conditions, benefits,
hiring_process, notes, job_description을 추출합니다.

[Output]
단일 JSON 객체만 반환하세요.$$,
    user_prompt = $$다음 채용공고를 분석하세요.
1) 섹션 헤더를 찾아 매핑표대로 배치하세요.
2) 모집부문 표에 직무가 2개 이상이면 recruitment_sections에 부문별로 넣으세요. 합치지 마세요.
3) 주요업무·자격요건·우대·근무조건·복지·채용절차·유의사항은 공고에 있을 때만 넣고, 없으면 [].
4) 각 bullet은 하나의 필드(또는 하나의 recruitment_section)에만 넣으세요.
5) org_culture/work_conditions/benefits/hiring_process/notes/recruitment_sections 는 배열로 반환하세요.

{{content}}$$,
    version_number = 11
WHERE id = 'b0000005-0001-0001-0001-000000000006';
