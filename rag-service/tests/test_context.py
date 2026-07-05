import pytest

from app.services.context_service import context_service
from app.schemas import ContextBuildRequest


@pytest.mark.asyncio
async def test_context_build_returns_ordered_keys():
    request = ContextBuildRequest(user_id="test-user", keywords=["java", "spring"], top_k=3)
    result = await context_service.build(request)
    assert "context" in result
    ctx = result["context"]
    for key in ["experiences", "resumes", "writing_styles", "prompts", "review_rules"]:
        assert key in ctx
        assert isinstance(ctx[key], list)
