package br.com.calendarmate.controller;

import br.com.calendarmate.service.InternalCleanupService;
import br.com.calendarmate.util.AdminTokenGuard;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/internal")
public class InternalCleanupController {

    private final InternalCleanupService cleanupService;

    public InternalCleanupController(InternalCleanupService cleanupService) {
        this.cleanupService = cleanupService;
    }

    @PostMapping("/cleanup")
    public InternalCleanupService.CleanupResult cleanup(
            @RequestHeader(value = "X-ADMIN-TOKEN", required = false) String header,
            @RequestParam(required = false) Integer historyRetentionMonths) throws IOException {

        AdminTokenGuard.require(header);
        return cleanupService.runDefault(historyRetentionMonths);
    }
}