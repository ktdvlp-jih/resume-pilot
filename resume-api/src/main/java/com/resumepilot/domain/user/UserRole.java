package com.resumepilot.domain.user;

public enum UserRole {
    USER,
    JOB_ADMIN,
    USER_ADMIN,
    ADMIN;

    public boolean canAccessAdmin() {
        return this == ADMIN || this == JOB_ADMIN || this == USER_ADMIN;
    }

    public boolean isFullAdmin() {
        return this == ADMIN;
    }

    public boolean canManageUsers() {
        return this == ADMIN || this == USER_ADMIN;
    }

    public boolean canManageJobPostings() {
        return this == ADMIN || this == JOB_ADMIN;
    }
}
