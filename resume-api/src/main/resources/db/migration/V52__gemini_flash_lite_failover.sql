-- Flash → Flash-Lite → OpenRouter 순 failover.
-- Gemini 무료 한도는 모델별로 분리되므로 동일 provider 다른 모델 허용.

DO $$
DECLARE
  gemini_id UUID;
  openrouter_id UUID;
  openai_id UUID;
  github_id UUID;
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
  SELECT id INTO gemini_id FROM llm_providers WHERE slug = 'gemini';
  SELECT id INTO openrouter_id FROM llm_providers WHERE slug = 'openrouter';
  SELECT id INTO openai_id FROM llm_providers WHERE slug = 'openai';
  SELECT id INTO github_id FROM llm_providers WHERE slug = 'github';

  IF gemini_id IS NULL OR openrouter_id IS NULL THEN
    RAISE NOTICE 'gemini/openrouter missing — skip';
    RETURN;
  END IF;

  FOREACH op IN ARRAY ops LOOP
    DELETE FROM llm_model_routes WHERE operation = op;

    INSERT INTO llm_model_routes (operation, provider_id, model_name, priority, enabled) VALUES
      (op, gemini_id, 'gemini-2.5-flash', 1, true),
      (op, gemini_id, 'gemini-2.5-flash-lite', 2, true),
      (op, openrouter_id, 'openrouter/free', 3, true);

    IF openai_id IS NOT NULL THEN
      INSERT INTO llm_model_routes (operation, provider_id, model_name, priority, enabled)
      VALUES (op, openai_id, 'gpt-4o-mini', 4, false);
    END IF;

    IF github_id IS NOT NULL THEN
      INSERT INTO llm_model_routes (operation, provider_id, model_name, priority, enabled)
      VALUES (op, github_id, 'openai/gpt-4o-mini', 5, false);
    END IF;
  END LOOP;
END $$;
