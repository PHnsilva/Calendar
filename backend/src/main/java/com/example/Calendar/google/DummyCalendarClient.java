package com.example.Calendar.google;

import com.example.Calendar.model.Servico;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.api.services.calendar.model.TimePeriod;
// imports necessários:
import com.google.api.services.calendar.model.Event;

import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Implementação leve que permite subir o contexto do Spring sem credenciais
 * Google.
 * Nunca use em produção — é apenas para testes / fallbacks locais.
 */
public class DummyCalendarClient implements CalendarClient {

    // armazenamento em memória (enquanto a JVM está rodando)
    private final Map<String, Event> store = new ConcurrentHashMap<>();

    @Override
    public Event createEvent(Servico s) throws IOException {
        Event ev = new Event();

        String id = "dummy-" + UUID.randomUUID();
        ev.setId(id);
        ev.setSummary(s.getTitle());
        ev.setDescription(s.getDescription());
        ev.setHtmlLink("http://localhost/dummy/event/" + id);

        // IMPORTANTÍSSIMO: setar start/end para available/freeBusy funcionarem
        // Servico deve ter start/end como Instant ou Date; aqui assumo Instant getters.
        // Ajuste se seus getters forem diferentes.
        if (s.getStart() != null) {
            ev.setStart(new EventDateTime().setDateTime(new DateTime(Date.from(s.getStart()))));
        }
        if (s.getEnd() != null) {
            ev.setEnd(new EventDateTime().setDateTime(new DateTime(Date.from(s.getEnd()))));
        }
        applyPrivateProps(ev, s);
        store.put(id, ev);
        return ev;
    }

    private static void applyPrivateProps(Event ev, Servico s) {
    Map<String, String> priv = new HashMap<>();

    // marca como evento do sistema
    priv.put("appSource", "calendar-backend");

    // campos usados por /my e pelo DTO
    priv.put("clientEmail", nullSafe(s.getClientEmail()));
    priv.put("clientFirstName", nullSafe(s.getClientFirstName()));
    priv.put("clientLastName", nullSafe(s.getClientLastName()));
    priv.put("clientPhone", nullSafe(s.getClientPhone()));
    priv.put("clientAddress", nullSafe(s.getClientAddress()));

    Event.ExtendedProperties ext = ev.getExtendedProperties();
    if (ext == null) ext = new Event.ExtendedProperties();
    ext.setPrivate(priv);
    ev.setExtendedProperties(ext);
}

private static String nullSafe(String v) {
    return v == null ? "" : v;
}

    @Override
    public void deleteEvent(String eventId) throws IOException {
        store.remove(eventId);
    }

    @Override
    public Event updateEvent(Servico s) throws IOException {
        String id = s.getEventId();
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("eventId é obrigatório para atualizar");
        }

        Event ev = store.get(id);
        if (ev == null) {
            // mantém comportamento parecido com "não encontrado"
            return null;
        }

        ev.setSummary(s.getTitle());
        ev.setDescription(s.getDescription());

        if (s.getStart() != null) {
            ev.setStart(new EventDateTime().setDateTime(new DateTime(Date.from(s.getStart()))));
        }
        if (s.getEnd() != null) {
            ev.setEnd(new EventDateTime().setDateTime(new DateTime(Date.from(s.getEnd()))));
        }

        applyPrivateProps(ev, s); // <-- aqui, depois do ev existir

        store.put(id, ev);
        return ev;
    }

    @Override
    public Event getEvent(String eventId) throws IOException {
        return store.get(eventId);
    }

    @Override
    public List<Event> listEvents(DateTime timeMin, DateTime timeMax) throws IOException {
        Instant min = toInstant(timeMin);
        Instant max = toInstant(timeMax);

        List<Event> out = new ArrayList<>();
        for (Event e : store.values()) {
            Instant start = eventStartInstant(e);
            if (start == null)
                continue;

            // filtra pelo início dentro do range [min, max)
            if (!start.isBefore(min) && start.isBefore(max)) {
                out.add(e);
            }
        }

        // ordena por start asc
        out.sort(Comparator.comparing(DummyCalendarClient::eventStartInstant,
                Comparator.nullsLast(Comparator.naturalOrder())));
        return out;
    }

    @Override
    public List<TimePeriod> freeBusy(DateTime timeMin, DateTime timeMax) throws IOException {
        Instant min = toInstant(timeMin);
        Instant max = toInstant(timeMax);

        List<TimePeriod> busy = new ArrayList<>();
        for (Event e : store.values()) {
            Instant s = eventStartInstant(e);
            Instant en = eventEndInstant(e);
            if (s == null || en == null)
                continue;

            // overlap simples: (s < max) && (en > min)
            if (s.isBefore(max) && en.isAfter(min)) {
                TimePeriod tp = new TimePeriod();
                tp.setStart(new DateTime(Date.from(s)));
                tp.setEnd(new DateTime(Date.from(en)));
                busy.add(tp);
            }
        }

        // ordena por início
        busy.sort(Comparator.comparing(tp -> toInstant(tp.getStart())));
        return busy;
    }

    private static Instant toInstant(DateTime dt) {
        if (dt == null)
            return Instant.EPOCH;
        return Instant.ofEpochMilli(dt.getValue());
    }

    private static Instant eventStartInstant(Event e) {
        if (e == null || e.getStart() == null)
            return null;
        DateTime dt = e.getStart().getDateTime();
        if (dt == null)
            return null;
        return Instant.ofEpochMilli(dt.getValue());
    }

    private static Instant eventEndInstant(Event e) {
        if (e == null || e.getEnd() == null)
            return null;
        DateTime dt = e.getEnd().getDateTime();
        if (dt == null)
            return null;
        return Instant.ofEpochMilli(dt.getValue());
    }
}