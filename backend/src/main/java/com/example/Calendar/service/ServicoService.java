package com.example.calendar.service;

import com.example.calendar.dto.ServicoRequest;
import com.example.calendar.google.GoogleCalendarClient;
import com.example.calendar.model.Servico;
import com.example.calendar.repository.ServicoRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class ServicoService {
    private final ServicoRepository repo;
    private final GoogleCalendarClient calendar;

    public ServicoService(ServicoRepository repo, GoogleCalendarClient calendar) {
        this.repo = repo; this.calendar = calendar;
    }

    /**
     * Cria um serviço + agenda um evento no Google Calendar.
     * Fluxo: montar Servico -> salvar no repo -> criar evento no calendar -> atualizar e retornar.
     */
    public Servico createServico(ServicoRequest req) throws Exception {
        Servico s = new Servico(UUID.randomUUID().toString(), req.getTitle(), req.getDescription(), req.getStart(), req.getEnd(), "AGENDADO");
        repo.save(s);
        String link = calendar.createEvent(s); // chama Google Calendar
        s.setDescription(s.getDescription() + "\n\nEvento: " + link);
        repo.save(s);
        return s;
    }

    /** Lista todos os serviços. */
    public List<Servico> listAll() { return repo.findAll(); }

    /** Cancela um serviço: atualiza status e tenta remover evento se eventId for conhecido. */
    public Servico cancel(String id) {
        return repo.findById(id).map(s -> {
            s.setStatus("CANCELADO");
            repo.save(s);
            // não removemos evento se id do evento não estiver salvo; melhorar salvando eventId ao criar.
            return s;
        }).orElseThrow(() -> new RuntimeException("Serviço não encontrado"));
    }
}
