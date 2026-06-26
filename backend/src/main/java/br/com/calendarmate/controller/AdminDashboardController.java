package br.com.calendarmate.controller;

import br.com.calendarmate.dto.AdminDashboardSummaryResponse;
import br.com.calendarmate.model.AdminPrincipal;
import br.com.calendarmate.service.AdminAuthService;
import br.com.calendarmate.service.AdminDashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {

    private final AdminDashboardService service;
    private final AdminAuthService adminAuthService;

    public AdminDashboardController(AdminDashboardService service, AdminAuthService adminAuthService) {
        this.service = service;
        this.adminAuthService = adminAuthService;
    }

    @GetMapping("/summary")
    public ResponseEntity<AdminDashboardSummaryResponse> summary(
            @RequestHeader(value = "X-ADMIN-SESSION", required = false) String session,
            @RequestHeader(value = "X-ADMIN-WORKSPACE", required = false) String workspace,
            @RequestHeader(value = "X-ADMIN-PROVIDER-ID", required = false) String providerId,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String city
    ) throws IOException {
        AdminPrincipal principal = adminAuthService.require(session, workspace, providerId);
        return ResponseEntity.ok(service.summary(principal, from, to, status, city));
    }
}
