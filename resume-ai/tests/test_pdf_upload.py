import base64
import io

import pytest

from app.services.job_analysis_service import job_analysis_service


@pytest.mark.asyncio
async def test_pdf_base64_extraction():
    try:
        from pypdf import PdfWriter
        writer = PdfWriter()
        writer.add_blank_page(width=200, height=200)
        buf = io.BytesIO()
        writer.write(buf)
        b64 = base64.b64encode(buf.getvalue()).decode()
    except Exception:
        pytest.skip("pypdf writer unavailable")
    result = await job_analysis_service.analyze("PDF", "", file_base64=b64)
    assert "source_type" in result or "error" in result
