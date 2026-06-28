package br.com.calendarmate.controller;

import br.com.calendarmate.dto.AdminFinanceConfigResponse;
import br.com.calendarmate.dto.AdminHealthResponse;
import br.com.calendarmate.dto.AdminStatementResponse;
import br.com.calendarmate.service.AdminAuthService;
import br.com.calendarmate.service.AdminFinanceService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/finance")
public class AdminFinanceController {

    private final AdminFinanceService service;
    private final AdminAuthService adminAuthService;

    public AdminFinanceController(AdminFinanceService service, AdminAuthService adminAuthService) {
        this.service = service;
        this.adminAuthService = adminAuthService;
    }

    @GetMapping("/statement")
    public AdminStatementResponse statement(
            @RequestHeader(value = "X-ADMIN-SESSION", required = false) String session,
            @RequestHeader(value = "X-ADMIN-WORKSPACE", required = false) String workspace,
            @RequestHeader(value = "X-ADMIN-PROVIDER-ID", required = false) String providerId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to
    ) {
        adminAuthService.requireOwner(session, workspace, providerId);
        return service.statement(from, to);
    }

    @GetMapping("/health")
    public AdminHealthResponse health(
            @RequestHeader(value = "X-ADMIN-SESSION", required = false) String session,
            @RequestHeader(value = "X-ADMIN-WORKSPACE", required = false) String workspace,
            @RequestHeader(value = "X-ADMIN-PROVIDER-ID", required = false) String providerId
    ) {
        adminAuthService.requireOwner(session, workspace, providerId);
        return service.health();
    }

    @GetMapping("/config")
    public AdminFinanceConfigResponse config(
            @RequestHeader(value = "X-ADMIN-SESSION", required = false) String session,
            @RequestHeader(value = "X-ADMIN-WORKSPACE", required = false) String workspace,
            @RequestHeader(value = "X-ADMIN-PROVIDER-ID", required = false) String providerId
    ) {
        adminAuthService.requireOwner(session, workspace, providerId);
        return service.config();
    }
}
