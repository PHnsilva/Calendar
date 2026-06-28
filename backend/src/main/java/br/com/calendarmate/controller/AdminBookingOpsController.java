package br.com.calendarmate.controller;

import br.com.calendarmate.dto.AdminBulkCancelRequest;
import br.com.calendarmate.dto.AdminBulkCancelResponse;
import br.com.calendarmate.service.AdminAuthService;
import br.com.calendarmate.service.AdminBookingOpsService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/admin/bookings")
public class AdminBookingOpsController {

    private final AdminBookingOpsService service;
    private final AdminAuthService adminAuthService;

    public AdminBookingOpsController(AdminBookingOpsService service, AdminAuthService adminAuthService) {
        this.service = service;
        this.adminAuthService = adminAuthService;
    }

    @PostMapping("/bulk-cancel")
    public ResponseEntity<AdminBulkCancelResponse> bulkCancel(
            @RequestHeader(value = "X-ADMIN-SESSION", required = false) String session,
            @RequestHeader(value = "X-ADMIN-WORKSPACE", required = false) String workspace,
            @RequestHeader(value = "X-ADMIN-PROVIDER-ID", required = false) String providerId,
            @Valid @RequestBody AdminBulkCancelRequest req
    ) throws IOException {
        adminAuthService.requireOwner(session, workspace, providerId);
        return ResponseEntity.ok(service.bulkCancel(req));
    }
}
