package com.example.Calendar.controller;

import com.example.Calendar.exception.ForbiddenException;
import com.example.Calendar.service.InternalCleanupService;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/internal")
public class InternalCleanupController {

    private final InternalCleanupService cleanupService;
    private final String adminToken;

    public InternalCleanupController(InternalCleanupService cleanupService) {
        this.cleanupService = cleanupService;
        this.adminToken = System.getenv("ADMIN_TOKEN");
    }

    private void validateAdmin(String header) {
        if (adminToken == null || adminToken.isBlank()) {
            throw new ForbiddenException("Admin desabilitado (ADMIN_TOKEN não configurado)");
        }
        if (header == null || !header.equals(adminToken)) {
            throw new ForbiddenException("Admin token required");
        }
    }

    @PostMapping("/cleanup")
    public InternalCleanupService.CleanupResult cleanup(
            @RequestHeader(value = "X-ADMIN-TOKEN", required = false) String header,
            @RequestParam(defaultValue = "30") long historyRetentionDays
    ) throws IOException {
        validateAdmin(header);

        long retentionSeconds = Math.max(0, historyRetentionDays) * 24L * 3600L;
        return cleanupService.runDefault(retentionSeconds);
    }
}