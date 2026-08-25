package com.resumepilot.presentation.dto.job;

import java.time.Instant;

public record JobPostingClosesAtRequest(Instant closesAt) {}
