-- 공개 솔루션 안내 챗봇 (HELP_CHAT)

INSERT INTO billing_operation_costs (operation, token_cost) VALUES
('HELP_CHAT', 0)
ON CONFLICT (operation) DO NOTHING;

INSERT INTO prompt_templates (id, type, name, description)
VALUES (
    'a0000001-0001-0001-0001-000000000011',
    'HELP_CHAT',
    '공개 도움 챗봇',
    'FAQ·사용법 지식만 근거로 공개 페이지에서 안내'
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
    'b0000001-0001-0001-0001-000000000010',
    'a0000001-0001-0001-0001-000000000011',
    1,
    $$당신은 ResumePilot 공개 도움 안내원입니다. 친절하고 짧게, 쉬운 한국어로 답합니다.$$,
    $$- 아래 「도움말 지식」에 있는 내용만 근거로 답하세요. 지식을 벗어나 지어내지 마세요.
- 지식에 없으면 「안내 문서에 없는 내용이에요. /guides 또는 /contact로 확인해 주세요.」라고 말하세요.
- STAR, RAG, draft, JSON, API, LLM, 임베딩, 토큰(기술 의미) 등 전문 용어·약어를 사용자에게 쓰지 마세요.
- 요금·패키지 금액·할인 등 가격 상세는 설명하지 마세요. /pricing 페이지를 안내하세요.
- 비밀키·내부 서버·관리자 설정은 안내하지 마세요.$$,
    $$사용자의 질문에 도움말 지식을 바탕으로 답합니다. 필요하면 관련 경로(/guides, /pricing, /contact 등)를 알려 주세요.$$,
    $$JSON 객체만 반환:
{
  "reply": "사용자에게 보여줄 한국어 답변 (2~6문장)",
  "citations": ["지식 문서의 관련 섹션 제목", "..."]
}
citations는 근거가 된 ## 섹션 제목을 0~3개. 없으면 [].$$,
    $$[Persona]
당신은 ResumePilot 공개 도움 안내원입니다. 친절하고 짧게, 쉬운 한국어로 답합니다.

[Guard]
- 도움말 지식에 있는 내용만 근거로 답하세요. 지어내기 금지.
- 없으면 가이드(/guides) 또는 문의(/contact)를 안내하세요.
- 전문 용어·약어 금지. 요금 상세 금지 → /pricing 안내.
- JSON만 출력.

[Output]
{"reply":"...","citations":[]}$$,
    $$[도움말 지식]
{{knowledge}}

[대화 이력]
{{chat_history}}

[사용자 질문]
{{user_message}}$$,
    '["knowledge","chat_history","user_message"]'::jsonb,
    true
)
ON CONFLICT (id) DO NOTHING;

UPDATE prompt_templates
SET active_version_id = 'b0000001-0001-0001-0001-000000000010'
WHERE type = 'HELP_CHAT' AND active_version_id IS NULL;

-- HELP_CHAT 라우트: EXPERIENCE_CHAT와 동일 provider 우선, 없으면 DeepSeek
DO $$
DECLARE
  provider_id UUID;
  model_name TEXT;
BEGIN
  SELECT r.provider_id, r.model_name
    INTO provider_id, model_name
  FROM llm_model_routes r
  WHERE r.operation = 'EXPERIENCE_CHAT' AND r.enabled = true
  ORDER BY r.priority ASC
  LIMIT 1;

  IF provider_id IS NULL THEN
    SELECT id INTO provider_id FROM llm_providers WHERE slug = 'deepseek';
    model_name := 'deepseek-v4-flash';
  END IF;

  IF provider_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM llm_model_routes WHERE operation = 'HELP_CHAT'
  ) THEN
    INSERT INTO llm_model_routes (operation, provider_id, model_name, priority, enabled)
    VALUES ('HELP_CHAT', provider_id, model_name, 1, true);
  END IF;
END $$;
