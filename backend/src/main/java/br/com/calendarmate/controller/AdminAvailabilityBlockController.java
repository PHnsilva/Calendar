package br.com.calendarmate.controller;

import br.com.calendarmate.dto.AvailabilityBlockCreateRequest;
import br.com.calendarmate.dto.AvailabilityBlockPreviewRequest;
import br.com.calendarmate.dto.AvailabilityBlockPreviewResponse;
import br.com.calendarmate.dto.AvailabilityBlockResponse;
import br.com.calendarmate.service.AdminAuthService;
import br.com.calendarmate.service.AvailabilityBlockService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/availability-blocks")
public class AdminAvailabilityBlockController {

    private final AvailabilityBlockService service;
    private final AdminAuthService adminAuthService;

    public AdminAvailabilityBlockController(AvailabilityBlockService service, AdminAuthService adminAuthService) {
        this.service = service;
        this.adminAuthService = adminAuthService;
    }

    @PostMapping("/preview")
    public ResponseEntity<AvailabilityBlockPreviewResponse> preview(
            @RequestHeader(value = "X-ADMIN-SESSION", required = false) String session,
            @Valid @RequestBody AvailabilityBlockPreviewRequest req
    ) throws IOException {
        adminAuthService.requireOwner(session);
        return ResponseEntity.ok(service.preview(req));
    }

    @PostMapping
    public ResponseEntity<AvailabilityBlockResponse> create(
            @RequestHeader(value = "X-ADMIN-SESSION", required = false) String session,
            @Valid @RequestBody AvailabilityBlockCreateRequest req
    ) throws IOException {
        adminAuthService.requireOwner(session);
        return ResponseEntity.ok(service.create(req));
    }

    @GetMapping
    public ResponseEntity<List<AvailabilityBlockResponse>> list(
            @RequestHeader(value = "X-ADMIN-SESSION", required = false) String session,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) String mode,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String reason
    ) throws IOException {
        adminAuthService.requireOwner(session);
        return ResponseEntity.ok(service.list(from, to, mode, type, reason));
    }

    @DeleteMapping("/{blockId}")
    public ResponseEntity<Void> delete(
            @RequestHeader(value = "X-ADMIN-SESSION", required = false) String session,
            @PathVariable String blockId
    ) throws IOException {
        adminAuthService.requireOwner(session);
        service.delete(blockId);
        return ResponseEntity.ok().build();
    }
}
