package com.example.Calendar.Controller;

import com.example.Calendar.dto.ServicoRequest;
import com.example.Calendar.model.Servico;
import com.example.Calendar.service.ServicoService;
import com.example.Calendar.service.TokenUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
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
        this.adminToken = System.getenv().getOrDefault("ADMIN_TOKEN", "secret-admin-token");
    }

    // ============================
    // PUBLIC
    // ============================

    @PostMapping
    public ResponseEntity<Servico> create(@Validated @RequestBody ServicoRequest req) throws IOException {
        Servico s = service.create(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(s);
    }

    @GetMapping("/me")
    public ResponseEntity<Servico> getByToken(@RequestParam String token) throws IOException {
        TokenUtil.VerifiedToken vt = tokenUtil.verify(token);
        if (vt == null) throw new SecurityException("Token inválido ou expirado");

        Servico s = service.getByEventId(vt.getEventId());
        return ResponseEntity.ok(s);
    }

    @PutMapping("/me/{eventId}")
    public ResponseEntity<Servico> updateByToken(
            @PathVariable String eventId,
            @RequestParam String token,
            @Validated @RequestBody ServicoRequest req
    ) throws IOException {

        TokenUtil.VerifiedToken vt = tokenUtil.verify(token);
        if (vt == null || !vt.getEventId().equals(eventId)) throw new SecurityException("Token inválido");

        Servico updated = service.updateByToken(eventId, req);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/me/{eventId}")
    public ResponseEntity<Void> deleteByToken(
            @PathVariable String eventId,
            @RequestParam String token
    ) throws IOException {

        TokenUtil.VerifiedToken vt = tokenUtil.verify(token);
        if (vt == null || !vt.getEventId().equals(eventId)) throw new SecurityException("Token inválido");

        service.cancelByToken(eventId);
        return ResponseEntity.ok().build();
    }

    // ============================
    // ADMIN
    // ============================

    private void validateAdmin(String header) {
        if (header == null || !header.equals(adminToken)) throw new SecurityException("Admin token required");
    }

    @GetMapping("/admin")
    public ResponseEntity<List<Servico>> listAll(
            @RequestHeader(value = "X-ADMIN-TOKEN", required = false) String header
    ) throws IOException {

        validateAdmin(header);
        return ResponseEntity.ok(service.listAll());
    }

    @DeleteMapping("/admin/{eventId}")
    public ResponseEntity<Void> adminDelete(
            @RequestHeader(value = "X-ADMIN-TOKEN", required = false) String header,
            @PathVariable String eventId
    ) throws IOException {

        validateAdmin(header);
        service.deleteById(eventId); // aqui "id" é o eventId do Google
        return ResponseEntity.ok().build();
    }

    // ============================
    // AVAILABLE
    // ============================

    @GetMapping("/available")
    public ResponseEntity<List<String>> getAvailable(
            @RequestParam LocalDate date,
            @RequestParam(defaultValue = "60") int slotMinutes
    ) throws IOException {

        List<String> slots = service.getAvailableSlots(date, slotMinutes);
        return ResponseEntity.ok(slots);
    }
}
