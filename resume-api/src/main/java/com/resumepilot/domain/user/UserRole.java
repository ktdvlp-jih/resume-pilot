package com.resumepilot.domain.user;

public enum UserRole {
    USER,
    JOB_ADMIN,
    ADMIN;

    public boolean canAccessAdmin() {
        return this == ADMIN || this == JOB_ADMIN;
    }
}
