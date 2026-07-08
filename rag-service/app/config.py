from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    database_url: str = "postgresql://resumepilot:resumepilot@localhost:5432/resumepilot"
    resume_api_url: str = "http://localhost:8080"
    internal_api_token: str = ""
    # 마이그레이션 폴백 — Admin LLM 설정 사용 시 비워도 됨
    openai_api_key: str = ""
    openai_base_url: str = ""
    embedding_model: str = "text-embedding-3-small"
    embedding_dimension: int = 1536


settings = Settings()
