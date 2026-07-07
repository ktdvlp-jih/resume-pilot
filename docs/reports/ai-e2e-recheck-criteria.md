# AI E2E 재실행 기준

> 대상: 운영 배포 이후 `TC-AI-05` 재검증 판단 기준  
> 테스트 스크립트: `scripts/deploy-smoke-e2e-ai.sh`

## 언제 재실행해야 하나 (필수)

- `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSION` 변경
- `rag-service`, `resume-ai`, `e2e/tests/ai-flow.spec.ts` 변경
- 배포 후 `추천 경험 0건`, `AI 생성 실패(500)` 등 징후 발생
- 운영 이슈 핫픽스(특히 임베딩/프롬프트/생성 경로) 직후

## 언제 생략해도 되나 (권장)

- 문서/주석/표현만 수정했고 AI 경로 코드 변경 없음
- 동일 커밋으로 이미 CI `AI E2E TC-AI-05` PASS 확인됨
- 운영 기능 수동 확인(추천/생성)도 정상

## 실행 방법 (서버)

```bash
cd ~/apps/resume-pilot
bash /home/jeon/apps/resume-pilot/scripts/deploy-smoke-e2e-ai.sh
```

## 합격 기준

- `tests/ai-flow.spec.ts` PASS
- `RAG recommend returned no experiences` 미발생
- 생성 결과/AI 패널(탐지·첨삭·면접질문·키워드) 표시

## 실패 시 1차 확인

1. `.env`의 임베딩/LLM 변수 확인
2. `rag-service`/`resume-ai` 컨테이너 상태 및 로그 확인
3. `vector_embeddings` 차원/입력 데이터 불일치 여부 확인
4. `scripts/deploy-smoke.sh` 선행 정상 여부 확인
