package com.example.Calendar.controller;

import com.example.Calendar.dto.ServicoCreateResponse;
import com.example.Calendar.dto.ServicoRequest;
import com.example.Calendar.dto.ServicoResponse;
import com.example.Calendar.service.ServicoService;
import com.example.Calendar.service.TokenUtil;
import com.example.Calendar.util.AdminTokenGuard;
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

    public ServicoController(ServicoService service, TokenUtil tokenUtil) {
        this.service = service;
        this.tokenUtil = tokenUtil;
    }

    // PUBLIC

    @PostMapping
    public ResponseEntity<ServicoCreateResponse> create(@Valid @RequestBody ServicoRequest req) throws IOException {
        ServicoCreateResponse created = service.create(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/me")
    public ResponseEntity<ServicoResponse> getByToken(@RequestParam String token) throws IOException {
        return ResponseEntity.ok(service.getByToken(token));
    }

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

    @GetMapping("/admin")
    public ResponseEntity<List<ServicoResponse>> listAll(
            @RequestHeader(value = "X-ADMIN-TOKEN", required = false) String header,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) throws IOException {

        AdminTokenGuard.require(header);
        return ResponseEntity.ok(service.listAllAdmin(from, to));
    }

    @DeleteMapping("/admin/{eventId}")
    public ResponseEntity<Void> adminDelete(
            @RequestHeader(value = "X-ADMIN-TOKEN", required = false) String header,
            @PathVariable String eventId) throws IOException {

        AdminTokenGuard.require(header);
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