package br.com.calendarmate.controller;

import br.com.calendarmate.dto.AdminDashboardSummaryResponse;
import br.com.calendarmate.service.AdminDashboardService;
import br.com.calendarmate.util.AdminTokenGuard;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {

    private final AdminDashboardService service;

    public AdminDashboardController(AdminDashboardService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public ResponseEntity<AdminDashboardSummaryResponse> summary(
            @RequestHeader(value = "X-ADMIN-TOKEN", required = false) String header,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String city
    ) throws IOException {
        AdminTokenGuard.require(header);
        return ResponseEntity.ok(service.summary(from, to, status, city));
    }
}