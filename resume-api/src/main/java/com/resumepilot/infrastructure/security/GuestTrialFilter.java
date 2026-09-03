package com.resumepilot.infrastructure.security;

import com.resumepilot.application.guest.GuestContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class GuestTrialFilter extends OncePerRequestFilter {

    public static final String COOKIE_NAME = "rp-guest-id";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String guestId = extractGuestId(request);
            if (guestId != null) {
                GuestContext.set(guestId);
            }
            filterChain.doFilter(request, response);
        } finally {
            GuestContext.clear();
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/v1/public/trial");
    }

    private static String extractGuestId(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (COOKIE_NAME.equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                return cookie.getValue().trim();
            }
        }
        return null;
    }
}
