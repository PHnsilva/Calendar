package com.example.Calendar.controller;

import com.example.Calendar.dto.AdminBulkCancelRequest;
import com.example.Calendar.dto.AdminBulkCancelResponse;
import com.example.Calendar.service.AdminBookingOpsService;
import com.example.Calendar.util.AdminTokenGuard;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/admin/bookings")
public class AdminBookingOpsController {

    private final AdminBookingOpsService service;

    public AdminBookingOpsController(AdminBookingOpsService service) {
        this.service = service;
    }

    @PostMapping("/bulk-cancel")
    public ResponseEntity<AdminBulkCancelResponse> bulkCancel(
            @RequestHeader(value = "X-ADMIN-TOKEN", required = false) String header,
            @Valid @RequestBody AdminBulkCancelRequest req
    ) throws IOException {
        AdminTokenGuard.require(header);
        return ResponseEntity.ok(service.bulkCancel(req));
    }
}