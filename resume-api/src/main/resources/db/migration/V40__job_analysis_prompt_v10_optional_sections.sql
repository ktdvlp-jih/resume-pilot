-- JOB_ANALYSIS 프롬프트 v10: 흔한 섹션 매핑(강제 아님) + 없으면 []

UPDATE prompt_versions
SET
    guard_prompt = $$- 공고에 없는 정보를 추측·발명하지 마세요.
- 사람인·기업 공고에 흔히 나오는 섹션(주요업무·자격요건·우대·근무조건·복지·채용절차·유의사항)이 있으면 매핑표대로 나누세요. 모든 공고에 전부 있는 것은 아니므로, 없는 섹션은 빈 배열([])로 두세요.
- 섹션 헤더를 기준으로 필드를 정확히 나누세요.
- 동일 bullet·문장을 두 필드 이상에 넣지 마세요(tech_keywords 토큰화는 예외).
- org_culture, work_conditions, benefits, hiring_process, notes 는 반드시 문자열 배열입니다. 단일 문자열·문자열화된 리스트 금지.
- 복지·혜택 항목을 org_culture에 넣지 마세요(benefits로).
- 근무형태·급여·근무지·근무시간은 work_conditions로.
- JSON만 출력하세요.$$,
    user_prompt = $$다음 채용공고를 분석하세요.
1) 섹션 헤더를 찾아 매핑표대로 배치하세요.
2) 주요업무·자격요건·우대·근무조건·복지·채용절차·유의사항은 사람인·기업 공고에서 자주 보이지만 필수는 아닙니다. 공고에 있을 때만 넣고, 없으면 [].
3) 각 bullet은 하나의 필드에만 넣으세요.
4) org_culture/work_conditions/benefits/hiring_process/notes 는 문자열 배열로 반환하세요.

{{content}}$$,
    version_number = 10
WHERE id = 'b0000005-0001-0001-0001-000000000006';
