-- DeepSeek OpenAI-compatible provider (키는 Admin에서 설정)

INSERT INTO llm_providers (id, slug, display_name, provider_type, base_url, enabled)
SELECT 'c0000001-0001-0001-0001-000000000006',
       'deepseek',
       'DeepSeek',
       'OPENAI_COMPAT',
       'https://api.deepseek.com',
       false
WHERE NOT EXISTS (
  SELECT 1 FROM llm_providers WHERE slug = 'deepseek'
);

-- chat failover에 DeepSeek Flash 슬롯 추가 (priority 3). 기존 3+는 한 칸씩 밀기.
-- Provider 비활성·키 없으면 runtime에서 자동 스킵됨.
DO $$
DECLARE
  deepseek_id UUID;
  op TEXT;
  ops TEXT[] := ARRAY[
    'GENERATE',
    'JOB_ANALYSIS',
    'AI_DETECTION',
    'AI_REVIEW',
    'INTERVIEW_QUESTIONS',
    'KEYWORD_COMPARE'
  ];
BEGIN
  SELECT id INTO deepseek_id FROM llm_providers WHERE slug = 'deepseek';
  IF deepseek_id IS NULL THEN
    RETURN;
  END IF;

  FOREACH op IN ARRAY ops LOOP
    IF EXISTS (
      SELECT 1 FROM llm_model_routes
      WHERE operation = op AND provider_id = deepseek_id
    ) THEN
      CONTINUE;
    END IF;

    UPDATE llm_model_routes
    SET priority = priority + 100, updated_at = NOW()
    WHERE operation = op AND priority >= 3;

    INSERT INTO llm_model_routes (operation, provider_id, model_name, priority, enabled)
    VALUES (op, deepseek_id, 'deepseek-v4-flash', 3, true);

    UPDATE llm_model_routes
    SET priority = priority - 99, updated_at = NOW()
    WHERE operation = op AND priority >= 100;
  END LOOP;
END $$;
