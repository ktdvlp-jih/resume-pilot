from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel

from app.core.response import ApiResponse
from app.schemas import ContextBuildRequest, EmbeddingRequest, SearchRequest
from app.services.context_service import context_service
from app.services.vector_repository import vector_repo


@asynccontextmanager
async def lifespan(app: FastAPI):
    await vector_repo.connect()
    yield
    await vector_repo.close()


app = FastAPI(title="ResumePilot RAG Service", version="0.1.0", lifespan=lifespan)


class HealthResponse(BaseModel):
    status: str


@app.get("/health", response_model=ApiResponse[HealthResponse])
async def health():
    return ApiResponse(data=HealthResponse(status="ok"))


@app.post("/embeddings")
async def create_embedding(request: EmbeddingRequest):
    result = await vector_repo.upsert_embedding(
        user_id=request.user_id,
        entity_type=request.entity_type,
        entity_id=request.entity_id,
        text=request.text,
        metadata=request.metadata,
    )
    return ApiResponse(data=result)


@app.post("/search")
async def search(request: SearchRequest):
    results = await vector_repo.search(
        query=request.query,
        user_id=request.user_id,
        entity_types=request.entity_types,
        top_k=request.top_k,
    )
    return ApiResponse(data=results)


@app.post("/context/build")
async def build_context(request: ContextBuildRequest):
    result = await context_service.build(request)
    return ApiResponse(data=result)
