package com.example.calendar.controller;

import com.example.calendar.dto.ServicoRequest;
import com.example.calendar.model.Servico;
import com.example.calendar.service.ServicoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/servicos")
public class ServicoController {
    private final ServicoService service;
    public ServicoController(ServicoService service) { this.service = service; }

    /** Cria e agenda um serviço.
     * POST /api/servicos
     * Body JSON: { "title": "...", "description": "...", "start": "2025-02-01T10:00:00Z", "end": "2025-02-01T11:00:00Z" }
     * Retorna o Servico criado (com link do evento adicionado na descrição).
     */
    @PostMapping
    public ResponseEntity<Servico> create(@RequestBody ServicoRequest req) throws Exception {
        return ResponseEntity.ok(service.createServico(req));
    }

    /** Lista todos.
     * GET /api/servicos
     */
    @GetMapping
    public List<Servico> list() { return service.listAll(); }

    /** Cancela (marca como CANCELADO).
     * PUT /api/servicos/{id}/cancel
     */
    @PutMapping("/{id}/cancel")
    public ResponseEntity<Servico> cancel(@PathVariable String id) {
        return ResponseEntity.ok(service.cancel(id));
    }
}
