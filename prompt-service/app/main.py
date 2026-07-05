from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel

from app.core.response import ApiResponse
from app.services.prompt_service import prompt_repo, prompt_renderer, prompt_test_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    await prompt_repo.connect()
    yield
    await prompt_repo.close()


app = FastAPI(title="ResumePilot Prompt Service", version="0.1.0", lifespan=lifespan)


class RenderRequest(BaseModel):
    prompt_type: str
    variables: dict[str, Any] = {}


class TestRequest(BaseModel):
    prompt_type: str | None = None
    system_prompt: str | None = None
    user_prompt: str | None = None
    variables: dict[str, Any] = {}


@app.get("/health")
async def health():
    return ApiResponse(data={"status": "ok"})


@app.get("/prompts/{prompt_type}")
async def get_prompt(prompt_type: str):
    prompt = await prompt_repo.get_active_prompt(prompt_type.upper())
    return ApiResponse(data=prompt)


@app.get("/prompts/{prompt_type}/versions")
async def list_versions(prompt_type: str):
    versions = await prompt_repo.list_versions(prompt_type.upper())
    return ApiResponse(data=versions)


@app.post("/prompts/render")
async def render_prompt(request: RenderRequest):
    prompt = await prompt_repo.get_active_prompt(request.prompt_type.upper())
    system = prompt_renderer.render(prompt["system_prompt"], request.variables)
    user = prompt_renderer.render(prompt["user_prompt"], request.variables)
    return ApiResponse(data={
        "prompt_type": request.prompt_type,
        "version_number": prompt["version_number"],
        "system_prompt": system,
        "user_prompt": user,
    })


@app.post("/prompts/test")
async def test_prompt(request: TestRequest):
    if request.system_prompt and request.user_prompt:
        system = prompt_renderer.render(request.system_prompt, request.variables)
        user = prompt_renderer.render(request.user_prompt, request.variables)
    else:
        prompt = await prompt_repo.get_active_prompt((request.prompt_type or "RESUME_GENERATION").upper())
        system = prompt_renderer.render(prompt["system_prompt"], request.variables)
        user = prompt_renderer.render(prompt["user_prompt"], request.variables)
    result = prompt_test_service.test(system, user)
    return ApiResponse(data={"result": result})
