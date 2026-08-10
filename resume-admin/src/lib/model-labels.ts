const MODEL_LABELS: Record<string, string> = {
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.0-flash-lite': 'Gemini 2.0 Flash Lite',
  'gemini-embedding-001': 'Gemini Embedding 001',
  'gpt-4o-mini': 'GPT-4o mini',
  'text-embedding-3-small': 'Text Embedding 3 Small',
  'openai/gpt-4o-mini': 'GPT-4o mini (GitHub/OpenRouter)',
  'openai/gpt-4.1-mini': 'GPT-4.1 mini (GitHub)',
  'meta/llama-3.3-70b-instruct': 'Llama 3.3 70B Instruct',
  'llama-3.1-8b-instant': 'Llama 3.1 8B Instant',
  'llama-3.3-70b-versatile': 'Llama 3.3 70B Versatile',
  'google/gemini-2.5-flash': 'Gemini 2.5 Flash (OpenRouter)',
  'meta-llama/llama-3.1-8b-instruct:free': 'Llama 3.1 8B Instruct (Free)',
  'deepseek/deepseek-r1:free': 'DeepSeek R1 (Free)',
};

export function getModelLabel(modelId?: string): string {
  if (!modelId) return '-';
  return MODEL_LABELS[modelId] ?? modelId;
}

export function formatModelDisplay(modelId?: string): string {
  if (!modelId) return '-';
  const label = getModelLabel(modelId);
  return label === modelId ? modelId : `${label} (${modelId})`;
}
