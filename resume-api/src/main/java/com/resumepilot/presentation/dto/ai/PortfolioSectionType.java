package com.resumepilot.presentation.dto.ai;

/**
 * 설정 포트폴리오 칸 종류 (경력기술서·5-1~5-5).
 */
public enum PortfolioSectionType {
    CAREER_STATEMENT("경력 기술서 — 전체 경력을 역할·성과·기술 깊이로 서술"),
    JOB_EXPERIENCE("5-1 직무 경험 및 역량 — 담당 업무·판단·성과"),
    COLLABORATION("5-2 협업 및 성과 — 역할 분담·갈등·공동 결과"),
    GROWTH_VALUES("5-3 성장과정·교우 관계·가치관 — 경험이 가치관을 뒷받침하는지"),
    PERSONALITY("5-4 성격의 장단점 — 구체 행동·사례"),
    MOTIVATION("5-5 지원동기 및 입사 포부 — 경험과 연결 가능한 동기 (회사명 날조 금지)");

    private final String purpose;

    PortfolioSectionType(String purpose) {
        this.purpose = purpose;
    }

    public String purpose() {
        return purpose;
    }
}
