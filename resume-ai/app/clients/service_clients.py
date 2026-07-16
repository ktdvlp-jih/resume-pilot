import httpx

from app.config import settings

# 서비스 간 호출용 공유 클라이언트 — 요청마다 생성하지 않고 커넥션 풀 재사용
_shared_client = httpx.AsyncClient(
    timeout=30.0,
    limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
)


class RagClient:
    async def build_context(
        self,
        user_id: str,
        keywords: list[str],
        job_analysis: dict | None = None,
        experience_ids: list[str] | None = None,
    ) -> dict:
        response = await _shared_client.post(
            f"{settings.rag_service_url}/context/build",
            json={
                "user_id": user_id,
                "keywords": keywords,
                "job_analysis": job_analysis,
                "experience_ids": experience_ids or [],
            },
        )
        response.raise_for_status()
        return response.json()["data"]


class PromptClient:
    async def render(self, prompt_type: str, variables: dict) -> dict:
        response = await _shared_client.post(
            f"{settings.prompt_service_url}/prompts/render",
            json={"prompt_type": prompt_type, "variables": variables},
        )
        response.raise_for_status()
        return response.json()["data"]


rag_client = RagClient()
prompt_client = PromptClient()
