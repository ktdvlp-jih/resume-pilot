-- 경험 AI 코치 채팅 (세션·메시지·프롬프트·과금·DeepSeek 라우트)

CREATE TABLE experience_chat_sessions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title                   VARCHAR(200) NOT NULL DEFAULT '새 경험',
    target_experience_id    UUID REFERENCES experiences(id) ON DELETE SET NULL,
    applied_experience_id   UUID REFERENCES experiences(id) ON DELETE SET NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    latest_draft            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_experience_chat_sessions_status CHECK (status IN ('ACTIVE', 'APPLIED', 'ARCHIVED'))
);

CREATE INDEX idx_experience_chat_sessions_user ON experience_chat_sessions(user_id, updated_at DESC);

CREATE TABLE experience_chat_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      UUID NOT NULL REFERENCES experience_chat_sessions(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL,
    content         TEXT NOT NULL,
    draft_snapshot  JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_experience_chat_messages_role CHECK (role IN ('user', 'assistant'))
);

CREATE INDEX idx_experience_chat_messages_session ON experience_chat_messages(session_id, created_at ASC);

INSERT INTO billing_operation_costs (operation, token_cost) VALUES
('EXPERIENCE_CHAT', 15)
ON CONFLICT (operation) DO NOTHING;

INSERT INTO prompt_templates (id, type, name, description)
VALUES (
    'a0000001-0001-0001-0001-000000000010',
    'EXPERIENCE_COACH',
    '경험 AI 코치',
    '대화로 경험 STAR·스킬을 정리. 사용자 발화만 draft에 반영'
)
ON CONFLICT (type) DO NOTHING;

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
    'b0000001-0001-0001-0001-000000000009',
    'a0000001-0001-0001-0001-000000000010',
    1,
    $$당신은 한국 취업 준비생의 경험을 STAR 형식으로 정리하는 코치입니다. 친절하고 짧게 대화합니다.$$,
    $$- 사용자가 말하지 않은 사실·수치·회사명·역할을 지어내지 마세요.
- draft 필드는 사용자 발화와 기존 draft에서 확인된 내용만 채우세요. 추측 금지.
- 부족하면 missingFields에 적고 reply에서 질문하세요.
- JSON 외 텍스트를 출력하지 마세요.$$,
    $$사용자와 대화하며 경험 라이브러리용 draft를 갱신합니다.

mode=edit 이면 existing_experience를 기준으로 수정합니다.
mode=create 이면 새 경험을 만듭니다.

ExperienceType: PROJECT, ACHIEVEMENT, COLLABORATION, CONFLICT_RESOLUTION, PROBLEM_SOLVING, LEADERSHIP, TECHNOLOGY, OTHER

draft 필드 (알면 채움, 모르면 null 또는 빈 문자열):
type, title, description, role, contribution, result, numericResult,
starSituation, starTask, starAction, starResult, skills (string[]), startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)$$,
    $$JSON 객체만 반환:
{
  "reply": "사용자에게 보여줄 한국어 답변 (2~5문장)",
  "draft": { ... },
  "missingFields": ["starAction", ...]
}$$,
    $$[Persona]
당신은 한국 취업 준비생의 경험을 STAR 형식으로 정리하는 코치입니다.

[Guard]
- 사용자가 말하지 않은 사실을 지어내지 마세요.
- draft는 확인된 내용만. 부족하면 missingFields와 reply 질문.
- JSON만 출력.

[Output]
{"reply":"...","draft":{...},"missingFields":[]}$$,
    $$mode: {{mode}}

{{existing_experience_block}}

현재 draft (JSON):
{{current_draft_json}}

대화 이력:
{{chat_history}}

사용자 메시지:
{{user_message}}$$,
    '["mode","existing_experience_block","current_draft_json","chat_history","user_message"]'::jsonb,
    true
)
ON CONFLICT (id) DO NOTHING;

UPDATE prompt_templates
SET active_version_id = 'b0000001-0001-0001-0001-000000000009'
WHERE type = 'EXPERIENCE_COACH' AND active_version_id IS NULL;

-- EXPERIENCE_CHAT: DeepSeek Flash 우선 (provider 활성·키 필요)
DO $$
DECLARE
  deepseek_id UUID;
BEGIN
  SELECT id INTO deepseek_id FROM llm_providers WHERE slug = 'deepseek';
  IF deepseek_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM llm_model_routes WHERE operation = 'EXPERIENCE_CHAT'
  ) THEN
    INSERT INTO llm_model_routes (operation, provider_id, model_name, priority, enabled)
    VALUES ('EXPERIENCE_CHAT', deepseek_id, 'deepseek-v4-flash', 1, true);
  END IF;
END $$;
