package com.example.Calendar.controller;

import com.example.Calendar.dto.AdminHealthResponse;
import com.example.Calendar.dto.AdminStatementResponse;
import com.example.Calendar.service.AdminFinanceService;
import com.example.Calendar.util.AdminTokenGuard;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/finance")
public class AdminFinanceController {

    private final AdminFinanceService service;

    public AdminFinanceController(AdminFinanceService service) {
        this.service = service;
    }

    @GetMapping("/statement")
    public AdminStatementResponse statement(
            @RequestHeader(value = "X-ADMIN-TOKEN", required = false) String header,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to
    ) {
        AdminTokenGuard.require(header);
        return service.statement(from, to);
    }

    @GetMapping("/health")
    public AdminHealthResponse health(
            @RequestHeader(value = "X-ADMIN-TOKEN", required = false) String header
    ) {
        AdminTokenGuard.require(header);
        return service.health();
    }
}