package com.example.Calendar.controller;

import com.example.Calendar.dto.ServicoCreateResponse;
import com.example.Calendar.dto.ServicoRequest;
import com.example.Calendar.dto.ServicoResponse;
import com.example.Calendar.exception.ForbiddenException;
import com.example.Calendar.service.ServicoService;
import com.example.Calendar.service.TokenUtil;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/servicos")
public class ServicoController {

    private final ServicoService service;
    private final TokenUtil tokenUtil;
    private final String adminToken;

    public ServicoController(ServicoService service, TokenUtil tokenUtil) {
        this.service = service;
        this.tokenUtil = tokenUtil;
        this.adminToken = System.getenv("ADMIN_TOKEN"); // sem default

    }

    // PUBLIC

    @PostMapping
    public ResponseEntity<ServicoCreateResponse> create(@Valid @RequestBody ServicoRequest req) throws IOException {
        ServicoCreateResponse created = service.create(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // retorna 1 agendamento (do token: eventId + email)
    @GetMapping("/me")
    public ResponseEntity<ServicoResponse> getByToken(@RequestParam String token) throws IOException {
        return ResponseEntity.ok(service.getByToken(token));
    }

    // lista agendamentos do cliente (pelo email do token)
    @GetMapping("/my")
    public ResponseEntity<List<ServicoResponse>> listMy(@RequestParam String token) throws IOException {
        return ResponseEntity.ok(service.listMy(token));
    }

    @PutMapping("/me/{eventId}")
    public ResponseEntity<ServicoResponse> updateByToken(
            @PathVariable String eventId,
            @RequestParam String token,
            @Valid @RequestBody ServicoRequest req) throws IOException {

        return ResponseEntity.ok(service.updateByToken(eventId, token, req));
    }

    @DeleteMapping("/me/{eventId}")
    public ResponseEntity<Void> deleteByToken(
            @PathVariable String eventId,
            @RequestParam String token) throws IOException {

        service.cancelByToken(eventId, token);
        return ResponseEntity.ok().build();
    }

    // ADMIN

    private void validateAdmin(String header) {
        if (adminToken == null || adminToken.isBlank()) {
            throw new ForbiddenException("Admin desabilitado (ADMIN_TOKEN não configurado)");
        }
        if (header == null || !header.equals(adminToken)) {
            throw new ForbiddenException("Admin token required");
        }
    }

    @GetMapping("/admin")
    public ResponseEntity<List<ServicoResponse>> listAll(
            @RequestHeader(value = "X-ADMIN-TOKEN", required = false) String header) throws IOException {

        validateAdmin(header);
        return ResponseEntity.ok(service.listAllAdmin());
    }

    @DeleteMapping("/admin/{eventId}")
    public ResponseEntity<Void> adminDelete(
            @RequestHeader(value = "X-ADMIN-TOKEN", required = false) String header,
            @PathVariable String eventId) throws IOException {

        validateAdmin(header);
        service.deleteByIdAdmin(eventId);
        return ResponseEntity.ok().build();
    }

    // AVAILABLE
    @GetMapping("/available")
    public ResponseEntity<List<String>> getAvailable(
            @RequestParam LocalDate date,
            @RequestParam(defaultValue = "60") int slotMinutes) throws IOException {

        return ResponseEntity.ok(service.getAvailableSlots(date, slotMinutes));
    }

}
