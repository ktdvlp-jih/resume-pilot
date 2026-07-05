import httpx

from app.config import settings


class RagClient:
    async def build_context(self, user_id: str, keywords: list[str], job_analysis: dict | None = None) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.rag_service_url}/context/build",
                json={"user_id": user_id, "keywords": keywords, "job_analysis": job_analysis},
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json()["data"]


class PromptClient:
    async def render(self, prompt_type: str, variables: dict) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.prompt_service_url}/prompts/render",
                json={"prompt_type": prompt_type, "variables": variables},
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json()["data"]


rag_client = RagClient()
prompt_client = PromptClient()
