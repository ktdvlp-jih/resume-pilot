-- OpenRouter를 무료(:free) 모델로 맞추고, 주요 chat failover에 포함합니다.
-- 재실행해도 안전한 멱등 스크립트입니다.

DO $$
DECLARE
  openrouter_id UUID;
  github_id UUID;
  gemini_id UUID;
  openai_id UUID;
BEGIN
  SELECT id INTO openrouter_id FROM llm_providers WHERE slug = 'openrouter';
  SELECT id INTO github_id FROM llm_providers WHERE slug = 'github';
  SELECT id INTO gemini_id FROM llm_providers WHERE slug = 'gemini';
  SELECT id INTO openai_id FROM llm_providers WHERE slug = 'openai';

  IF openrouter_id IS NULL THEN
    RAISE NOTICE 'openrouter provider missing — skip';
    RETURN;
  END IF;

  -- GENERATE: 임시 우선순위로 재배치 후
  -- gemini(1) → openrouter:free(2) → openai(3) → github(4)
  IF EXISTS (
    SELECT 1 FROM llm_model_routes WHERE operation = 'GENERATE' AND provider_id = openrouter_id
  ) THEN
    UPDATE llm_model_routes
    SET priority = priority + 100, updated_at = NOW()
    WHERE operation = 'GENERATE';

    UPDATE llm_model_routes
    SET priority = 1, updated_at = NOW()
    WHERE operation = 'GENERATE' AND provider_id = gemini_id;

    UPDATE llm_model_routes
    SET priority = 2,
        model_name = 'meta-llama/llama-3.1-8b-instruct:free',
        enabled = true,
        updated_at = NOW()
    WHERE operation = 'GENERATE' AND provider_id = openrouter_id;

    UPDATE llm_model_routes
    SET priority = 3, updated_at = NOW()
    WHERE operation = 'GENERATE' AND provider_id = openai_id;

    UPDATE llm_model_routes
    SET priority = 4, updated_at = NOW()
    WHERE operation = 'GENERATE' AND provider_id = github_id;
  END IF;

  -- 3칸 체인: priority 3이 GitHub면 OpenRouter 무료로 교체
  IF github_id IS NOT NULL THEN
    UPDATE llm_model_routes
    SET provider_id = openrouter_id,
        model_name = 'meta-llama/llama-3.1-8b-instruct:free',
        enabled = true,
        updated_at = NOW()
    WHERE operation IN ('AI_DETECTION', 'AI_REVIEW', 'INTERVIEW_QUESTIONS', 'KEYWORD_COMPARE')
      AND priority = 3
      AND provider_id = github_id;
  END IF;

  -- JOB_ANALYSIS priority 4 → OpenRouter 무료
  UPDATE llm_model_routes
  SET provider_id = openrouter_id,
      model_name = 'meta-llama/llama-3.1-8b-instruct:free',
      enabled = true,
      updated_at = NOW()
  WHERE operation = 'JOB_ANALYSIS'
    AND priority = 4
    AND provider_id IS DISTINCT FROM openrouter_id;

  -- 이미 OpenRouter인 모든 chat 라우트 모델명을 무료로 고정
  UPDATE llm_model_routes
  SET model_name = 'meta-llama/llama-3.1-8b-instruct:free',
      enabled = true,
      updated_at = NOW()
  WHERE provider_id = openrouter_id
    AND operation <> 'EMBEDDING'
    AND model_name IS DISTINCT FROM 'meta-llama/llama-3.1-8b-instruct:free';
END $$;
