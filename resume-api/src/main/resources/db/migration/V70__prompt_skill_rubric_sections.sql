-- prompt_versions에 Skill·Rubric 슬롯 추가.
-- 합성 순서: Persona → Guard → Skill → Rubric → Task → Output. 빈 Skill/Rubric은 생략.

ALTER TABLE prompt_versions
    ADD COLUMN IF NOT EXISTS skill_prompt TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS rubric_prompt TEXT NOT NULL DEFAULT '';
