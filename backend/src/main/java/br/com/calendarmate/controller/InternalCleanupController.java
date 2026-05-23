package br.com.calendarmate.controller;

import br.com.calendarmate.service.AdminAuthService;
import br.com.calendarmate.service.InternalCleanupService;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/internal")
public class InternalCleanupController {

    private final InternalCleanupService cleanupService;
    private final AdminAuthService adminAuthService;

    public InternalCleanupController(InternalCleanupService cleanupService, AdminAuthService adminAuthService) {
        this.cleanupService = cleanupService;
        this.adminAuthService = adminAuthService;
    }

    @PostMapping("/cleanup")
    public InternalCleanupService.CleanupResult cleanup(
            @RequestHeader(value = "X-ADMIN-SESSION", required = false) String session,
            @RequestParam(required = false) Integer historyRetentionMonths) throws IOException {

        adminAuthService.requireOwner(session);
        return cleanupService.runDefault(historyRetentionMonths);
    }
}
