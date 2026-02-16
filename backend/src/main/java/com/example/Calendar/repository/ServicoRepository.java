package com.example.calendar.repository;

import com.example.calendar.model.Servico;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class ServicoRepository {
    private final Map<String, Servico> store = new ConcurrentHashMap<>();

    /** Salva ou atualiza um serviço. */
    public Servico save(Servico s) { store.put(s.getId(), s); return s; }

    /** Busca por id. */
    public Optional<Servico> findById(String id) { return Optional.ofNullable(store.get(id)); }

    /** Lista todos (usa Stream para conversão). */
    public List<Servico> findAll() { return store.values().stream().collect(Collectors.toList()); }

    /** Remove um serviço. */
    public void delete(String id) { store.remove(id); }
}
