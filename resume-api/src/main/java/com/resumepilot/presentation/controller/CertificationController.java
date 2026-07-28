package com.resumepilot.presentation.controller;

import com.resumepilot.application.certification.CertificationLookupService;
import com.resumepilot.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/certifications")
@RequiredArgsConstructor
public class CertificationController {

    private final CertificationLookupService certificationLookupService;

    @GetMapping("/lookup")
    public ApiResponse<CertificationLookupService.LookupResponse> lookup(
            @RequestParam("q") String query
    ) {
        return ApiResponse.ok(certificationLookupService.lookup(query));
    }

    @GetMapping("/status")
    public ApiResponse<StatusResponse> status() {
        boolean configured = certificationLookupService.isConfigured();
        return ApiResponse.ok(new StatusResponse(
                configured,
                configured ? "QNET" : null
        ));
    }

    public record StatusResponse(boolean configured, String provider) {}
}
