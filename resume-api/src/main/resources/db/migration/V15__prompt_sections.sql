ALTER TABLE prompt_versions
    ADD COLUMN persona_prompt TEXT,
    ADD COLUMN guard_prompt TEXT,
    ADD COLUMN task_prompt TEXT,
    ADD COLUMN output_prompt TEXT;

-- v2 등 섹션 마커가 있는 프롬프트 분리
UPDATE prompt_versions
SET
    persona_prompt = btrim(substring(system_prompt FROM '\[Persona[^\]]*\]\s*\n?(.*?)(?=\n\[Guard|\Z)')),
    guard_prompt = btrim(substring(system_prompt FROM '\[Guard[^\]]*\]\s*\n?(.*?)(?=\n\[Task|\Z)')),
    task_prompt = btrim(substring(system_prompt FROM '\[Task[^\]]*\]\s*\n?(.*?)(?=\n\[Output|\Z)')),
    output_prompt = btrim(substring(system_prompt FROM '\[Output[^\]]*\]\s*\n?(.*)\Z'))
WHERE system_prompt ~ '\[Persona';

-- 레거시(v1 등): 본문 전체를 Task에 보관
UPDATE prompt_versions
SET
    persona_prompt = COALESCE(persona_prompt, ''),
    guard_prompt = COALESCE(guard_prompt, ''),
    task_prompt = COALESCE(NULLIF(task_prompt, ''), system_prompt),
    output_prompt = COALESCE(output_prompt, '')
WHERE persona_prompt IS NULL
   OR guard_prompt IS NULL
   OR task_prompt IS NULL
   OR output_prompt IS NULL;

ALTER TABLE prompt_versions
    ALTER COLUMN persona_prompt SET DEFAULT '',
    ALTER COLUMN guard_prompt SET DEFAULT '',
    ALTER COLUMN task_prompt SET DEFAULT '',
    ALTER COLUMN output_prompt SET DEFAULT '';

UPDATE prompt_versions SET
    persona_prompt = COALESCE(persona_prompt, ''),
    guard_prompt = COALESCE(guard_prompt, ''),
    task_prompt = COALESCE(task_prompt, ''),
    output_prompt = COALESCE(output_prompt, '');

ALTER TABLE prompt_versions
    ALTER COLUMN persona_prompt SET NOT NULL,
    ALTER COLUMN guard_prompt SET NOT NULL,
    ALTER COLUMN task_prompt SET NOT NULL,
    ALTER COLUMN output_prompt SET NOT NULL;
