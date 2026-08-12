-- OpenRouter 무료 라우터(openrouter/free)로 통일.
-- meta-llama/llama-3.1-8b-instruct:free 는 2026-08 기준 무료 제공 종료(404).

UPDATE llm_model_routes r
SET model_name = 'openrouter/free',
    enabled = true,
    updated_at = NOW()
FROM llm_providers p
WHERE r.provider_id = p.id
  AND p.slug = 'openrouter'
  AND r.operation <> 'EMBEDDING'
  AND r.model_name IS DISTINCT FROM 'openrouter/free';
