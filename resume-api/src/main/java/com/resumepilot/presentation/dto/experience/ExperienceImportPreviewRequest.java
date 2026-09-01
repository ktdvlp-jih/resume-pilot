package com.resumepilot.presentation.dto.experience;

/** Notion: pageId 또는 pageUrl. GitHub: repoFullName(owner/repo) 없으면 내 저장소 목록. */
public record ExperienceImportPreviewRequest(
        String pageId,
        String pageUrl,
        String repoFullName,
        /** 요청에 포함하면 저장 없이 일회 미리보기 (비우면 user_integrations 사용) */
        String accessToken
) {}
