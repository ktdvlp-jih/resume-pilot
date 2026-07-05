from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    database_url: str = "postgresql://resumepilot:resumepilot@localhost:5432/resumepilot"
    openai_api_key: str = ""
    openai_base_url: str = ""
    openai_model: str = "gpt-4o-mini"
    rag_service_url: str = "http://localhost:8002"
    prompt_service_url: str = "http://localhost:8001"


settings = Settings()
