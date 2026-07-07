# RAG Pipeline

## Flow

```
JobAnalysis → KeywordExtraction → VectorSearch
  → ExperienceSearch → ResumeSearch → StyleSearch
  → PromptSearch → ContextAssembly → LLMGenerate
  → AIDetection → FinalResult
```

## Step Details

| Step | Service | Description |
|------|---------|-------------|
| 1. JobAnalysis | resume-ai | Parse job posting (PDF/image/URL/text) |
| 2. KeywordExtraction | resume-ai | Extract tech keywords, competencies |
| 3-7. VectorSearch + Context | rag-service | Multi-source semantic search |
| 8. LLMGenerate | resume-ai | Render prompt + call LLM |
| 9. AIDetection | resume-ai | Sentence-level AI trace detection |
| 10. FinalResult | resume-ai | Quality scores + reviews |

## Search Order (rag-service)

1. **EXPERIENCE** — user project/work/achievement data
2. **RESUME** — existing cover letter versions
3. **WRITING_STYLE** — user tone analysis
4. **PROMPT** — active prompt templates
5. **REVIEW_RULE** — forbidden expressions

## API Endpoints

### rag-service

- `POST /embeddings` — Create/update vector embedding
- `POST /search` — Semantic search with filters
- `POST /context/build` — Full RAG context assembly

### resume-ai

- `POST /generate/resume` — End-to-end generation pipeline
- `POST /detect/ai-traces` — Post-generation AI detection
- `POST /review/feedback` — Paragraph-level review

## Embedding Configuration

- Model: `text-embedding-3-small`
- Dimensions: 1536
- Index: HNSW with `vector_cosine_ops`
- Fallback: Deterministic hash-based vector (dev without OpenAI key)

## Business Constraints

- Context must include `experience_ids` for validation
- Insufficient experiences → return `"내용이 부족하여 생성하지 않음"`
- Forbidden expressions checked against DB + defaults
