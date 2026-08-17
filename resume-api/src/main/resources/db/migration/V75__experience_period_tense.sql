-- 경험 start/end 날짜를 시제(과거/현재)로 쓰도록 생성·다듬기·첨삭 프롬프트 갱신.
-- RAG 본문의 「기간: … (종료|진행중)」과 짝을 맞춘다.

INSERT INTO prompt_versions (
    id,
    prompt_template_id,
    version_number,
    persona_prompt,
    guard_prompt,
    skill_prompt,
    rubric_prompt,
    task_prompt,
    output_prompt,
    system_prompt,
    user_prompt,
    variables,
    is_active
)
SELECT
    'b0000019-0001-0001-0001-000000000004',
    prompt_template_id,
    22,
    persona_prompt,
    guard_prompt || E'\n- 각 경험의 「기간」줄을 시제의 근거로 쓰세요. (종료)면 과거형만. 「맡고 있다/구축 중이다/전환하며 담당한다」 금지. (진행중)인 경험만 현재형. 기간이 없으면 현재 담당이라고 단정하지 마세요.',
    skill_prompt,
    rubric_prompt,
    task_prompt || E'\n8. 경험 기간이 종료면 과거 경험으로 쓰고, 진행중만 현재 업무로 씁니다.',
    output_prompt,
    '',
    user_prompt || E'\n각 경험의 「기간」이 종료면 과거형, 진행중만 현재형으로 쓰세요. 끝난 VOC·구축을 지금 하는 일처럼 쓰지 마세요.',
    variables,
    true
FROM prompt_versions
WHERE id = 'b0000019-0001-0001-0001-000000000003'
ON CONFLICT (id) DO NOTHING;

UPDATE prompt_versions SET is_active = false
WHERE prompt_template_id = 'a0000001-0001-0001-0001-000000000001'
  AND id <> 'b0000019-0001-0001-0001-000000000004';

UPDATE prompt_versions SET is_active = true
WHERE id = 'b0000019-0001-0001-0001-000000000004';

UPDATE prompt_templates
SET active_version_id = 'b0000019-0001-0001-0001-000000000004', updated_at = NOW()
WHERE id = 'a0000001-0001-0001-0001-000000000001';

INSERT INTO prompt_versions (
    id,
    prompt_template_id,
    version_number,
    persona_prompt,
    guard_prompt,
    skill_prompt,
    rubric_prompt,
    task_prompt,
    output_prompt,
    system_prompt,
    user_prompt,
    variables,
    is_active
)
SELECT
    'b0000001-0001-0001-0001-000000000023',
    prompt_template_id,
    5,
    persona_prompt,
    guard_prompt || E'\n- 시제(과거/현재)와 날짜를 바꾸지 마세요. 종료된 일을 현재 담당처럼 쓰지 마세요.',
    skill_prompt,
    rubric_prompt,
    task_prompt,
    output_prompt,
    '',
    user_prompt,
    variables,
    true
FROM prompt_versions
WHERE id = 'b0000001-0001-0001-0001-000000000022'
ON CONFLICT (id) DO NOTHING;

UPDATE prompt_versions SET is_active = FALSE
WHERE prompt_template_id = 'a0000001-0001-0001-0001-000000000009'
  AND id <> 'b0000001-0001-0001-0001-000000000023';

UPDATE prompt_versions SET is_active = TRUE
WHERE id = 'b0000001-0001-0001-0001-000000000023';

UPDATE prompt_templates
SET active_version_id = 'b0000001-0001-0001-0001-000000000023', updated_at = NOW()
WHERE type = 'AI_HUMANIZE';

INSERT INTO prompt_versions (
    id,
    prompt_template_id,
    version_number,
    persona_prompt,
    guard_prompt,
    skill_prompt,
    rubric_prompt,
    task_prompt,
    output_prompt,
    system_prompt,
    user_prompt,
    variables,
    is_active
)
SELECT
    'b0000016-0001-0001-0001-000000000007',
    prompt_template_id,
    9,
    persona_prompt,
    guard_prompt,
    skill_prompt,
    rubric_prompt,
    task_prompt || E'\n7) 끝난 경험(기간 종료)을 현재 담당처럼 쓴 현재형',
    output_prompt,
    '',
    user_prompt,
    variables,
    true
FROM prompt_versions
WHERE id = 'b0000016-0001-0001-0001-000000000006'
ON CONFLICT (id) DO NOTHING;

UPDATE prompt_versions SET is_active = false
WHERE prompt_template_id = 'a0000001-0001-0001-0001-000000000004'
  AND id <> 'b0000016-0001-0001-0001-000000000007';

UPDATE prompt_versions SET is_active = true
WHERE id = 'b0000016-0001-0001-0001-000000000007';

UPDATE prompt_templates
SET active_version_id = 'b0000016-0001-0001-0001-000000000007', updated_at = NOW()
WHERE id = 'a0000001-0001-0001-0001-000000000004';

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
    'b0000019-0001-0001-0001-000000000004',
    'b0000001-0001-0001-0001-000000000023',
    'b0000016-0001-0001-0001-000000000007'
);
