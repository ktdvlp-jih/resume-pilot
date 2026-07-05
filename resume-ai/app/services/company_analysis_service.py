from typing import Any

from app.services.job_analysis_service import job_analysis_service


class CompanyAnalysisService:
    def enrich(self, job_analysis: dict[str, Any]) -> dict[str, Any]:
        company_name = job_analysis.get("company_name", "Unknown")
        tech = job_analysis.get("tech_keywords", [])
        talent = job_analysis.get("talent_profile", [])

        return {
            **job_analysis,
            "company_profile": {
                "name": company_name,
                "core_values": job_analysis.get("core_values", talent[:3]),
                "talent_profile": talent,
                "tech_stack": tech,
                "culture": job_analysis.get("org_culture"),
                "hiring_keywords": tech + talent,
            },
        }


company_analysis_service = CompanyAnalysisService()
