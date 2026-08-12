from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """우선순위: OS env > 저장소 루트 .env.local > 서비스 .env > 기본값."""

    model_config = SettingsConfigDict(
        env_file=(
            str(_REPO_ROOT / ".env"),
            ".env",
            str(_REPO_ROOT / ".env.local"),
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql://resumepilot:resumepilot@localhost:5432/resumepilot"
    resume_api_url: str = "http://localhost:8080"
    internal_api_token: str = ""
    # 마이그레이션 폴백 — Admin LLM 설정 사용 시 비워도 됨
    openai_api_key: str = ""
    openai_base_url: str = ""
    embedding_model: str = "text-embedding-3-small"
    embedding_dimension: int = 1536


settings = Settings()
