-- prompt-service는 system_prompt만 로드한다.
-- Skill·Rubric 슬롯 본문(40패턴 전문 등)을 system_prompt에 반영한다.
-- 빈 Skill/Rubric은 헤더를 생략한다 (PromptSections.compose와 동일).

UPDATE prompt_versions
SET system_prompt =
    '[Persona · 페르소나]' || E'\n' || persona_prompt
    || E'\n\n' || '[Guard · 가드레일]' || E'\n' || guard_prompt
    || CASE
        WHEN btrim(skill_prompt) <> '' THEN E'\n\n' || '[Skill · 스킬]' || E'\n' || skill_prompt
        ELSE ''
       END
    || CASE
        WHEN btrim(rubric_prompt) <> '' THEN E'\n\n' || '[Rubric · 자소서 문체]' || E'\n' || rubric_prompt
        ELSE ''
       END
    || E'\n\n' || '[Task · 작업]' || E'\n' || task_prompt
    || E'\n\n' || '[Output · 출력]' || E'\n' || output_prompt
WHERE id IN (
    'b0000001-0001-0001-0001-000000000022', -- AI_HUMANIZE v4
    'b0000019-0001-0001-0001-000000000003', -- RESUME_GENERATION v21
    'b0000016-0001-0001-0001-000000000006'  -- AI_REVIEW v8
);
