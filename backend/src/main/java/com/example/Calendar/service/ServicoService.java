package com.example.Calendar.service;

import com.example.Calendar.dto.ServicoRequest;
import com.example.Calendar.google.CalendarClient;
import com.example.Calendar.model.Servico;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.api.services.calendar.model.TimePeriod;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

public class ServicoService {
    private static final Logger log = LoggerFactory.getLogger(ServicoService.class);

    private final CalendarClient calendar;
    private final EmailService emailService;
    private final TokenUtil tokenUtil;

    public ServicoService(CalendarClient calendar, EmailService emailService, TokenUtil tokenUtil) {
        this.calendar = calendar;
        this.emailService = emailService;
        this.tokenUtil = tokenUtil;
    }

    public Servico create(ServicoRequest req) throws IOException {
        ZoneId zone = ZoneId.of("America/Sao_Paulo");

        ZonedDateTime startZ = ZonedDateTime.of(req.getDate(), req.getTime(), zone);
        ZonedDateTime endZ = startZ.plusMinutes(60);

        Instant start = startZ.toInstant();
        Instant end = endZ.toInstant();

        if (!end.isAfter(start)) throw new IllegalArgumentException("Horário inválido");

        // disponibilidade
        DateTime timeMin = new DateTime(Date.from(start));
        DateTime timeMax = new DateTime(Date.from(end));
        List<TimePeriod> busy = calendar.freeBusy(timeMin, timeMax);
        if (busy != null && !busy.isEmpty()) throw new IllegalStateException("Horário indisponível");

        Servico s = new Servico();
        s.setId(UUID.randomUUID().toString()); // só para resposta
        s.setTitle(req.getServiceType());
        s.setDescription(req.getServiceType());
        s.setStart(start);
        s.setEnd(end);
        s.setClientFirstName(req.getClientFirstName());
        s.setClientLastName(req.getClientLastName());
        s.setClientEmail(req.getClientEmail());
        s.setClientPhone(req.getClientPhone());
        s.setClientAddress(req.getClientAddress());
        s.setStatus("PENDENTE");

        Event created = calendar.createEvent(s);

        s.setEventId(created.getId());
        s.setEventLink(created.getHtmlLink());
        s.setStatus("AGENDADO");

        String token = tokenUtil.generate(s.getEventId(), s.getClientEmail());
        String manageLink = System.getenv().getOrDefault("APP_BASE_URL", "http://localhost:8080")
                + "/api/servicos/me?token=" + token;

        emailService.sendConfirmation(
                s.getClientEmail(),
                "Confirmação de agendamento",
                "Seu agendamento está confirmado.",
                manageLink
        );

        return s;
    }

    public Servico getByEventId(String eventId) throws IOException {
        Event e = calendar.getEvent(eventId);
        if (e == null) throw new IllegalArgumentException("Agendamento não encontrado");
        return mapEventToServico(e);
    }

    public Servico updateByToken(String eventId, ServicoRequest req) throws IOException {
        Event existing = calendar.getEvent(eventId);
        if (existing == null) throw new IllegalArgumentException("Evento não encontrado");

        ZoneId zone = ZoneId.of("America/Sao_Paulo");
        ZonedDateTime startZ = ZonedDateTime.of(req.getDate(), req.getTime(), zone);
        ZonedDateTime endZ = startZ.plusMinutes(60);

        Instant newStart = startZ.toInstant();
        Instant newEnd = endZ.toInstant();

        if (!newEnd.isAfter(newStart)) throw new IllegalArgumentException("Horário inválido");

        DateTime timeMin = new DateTime(Date.from(newStart));
        DateTime timeMax = new DateTime(Date.from(newEnd));
        List<TimePeriod> busy = calendar.freeBusy(timeMin, timeMax);
        if (busy == null) busy = Collections.emptyList();

        // permitir se o busy for apenas o próprio evento no mesmo intervalo
        Instant existingStart = extractInstant(existing.getStart());
        Instant existingEnd = extractInstant(existing.getEnd());

        boolean conflict = false;
        for (TimePeriod tp : busy) {
            if (tp.getStart() == null || tp.getEnd() == null) {
                conflict = true;
                break;
            }
            Instant busyStart = Instant.ofEpochMilli(tp.getStart().getValue());
            Instant busyEnd = Instant.ofEpochMilli(tp.getEnd().getValue());

            boolean equalsExisting = existingStart != null && existingEnd != null
                    && busyStart.equals(existingStart) && busyEnd.equals(existingEnd);

            if (!equalsExisting) {
                conflict = true;
                break;
            }
        }
        if (conflict) throw new IllegalStateException("Horário indisponível");

        Servico s = new Servico();
        s.setEventId(eventId);
        s.setTitle(req.getServiceType());
        s.setDescription(req.getServiceType());
        s.setStart(newStart);
        s.setEnd(newEnd);
        s.setClientFirstName(req.getClientFirstName());
        s.setClientLastName(req.getClientLastName());
        s.setClientEmail(req.getClientEmail());
        s.setClientPhone(req.getClientPhone());
        s.setClientAddress(req.getClientAddress());
        s.setStatus("AGENDADO");

        Event updated = calendar.updateEvent(s);
        return mapEventToServico(updated);
    }

    public void cancelByToken(String eventId) throws IOException {
        Event e = calendar.getEvent(eventId);
        if (e == null) throw new IllegalArgumentException("Evento não encontrado");
        calendar.deleteEvent(eventId);
    }

    public List<Servico> listAll() throws IOException {
        ZoneId zone = ZoneId.of("America/Sao_Paulo");
        ZonedDateTime from = ZonedDateTime.now(zone).minusDays(1);
        ZonedDateTime to = ZonedDateTime.now(zone).plusYears(1);

        DateTime timeMin = new DateTime(Date.from(from.toInstant()));
        DateTime timeMax = new DateTime(Date.from(to.toInstant()));

        List<Event> events = calendar.listEvents(timeMin, timeMax);
        if (events == null) return Collections.emptyList();

        return events.stream().map(this::mapEventToServico).collect(Collectors.toList());
    }

    public void deleteById(String eventId) throws IOException {
        Event e = calendar.getEvent(eventId);
        if (e == null) throw new IllegalArgumentException("Not found");
        calendar.deleteEvent(eventId);
    }

    public List<String> getAvailableSlots(LocalDate date, int slotMinutes) throws IOException {
        LocalTime WORK_START = LocalTime.of(8, 0);
        LocalTime WORK_END = LocalTime.of(18, 0);
        LocalTime LUNCH_START = LocalTime.of(12, 0);
        LocalTime LUNCH_END = LocalTime.of(13, 0);
        ZoneId zone = ZoneId.of("America/Sao_Paulo");

        ZonedDateTime dayStart = ZonedDateTime.of(date, WORK_START, zone);
        ZonedDateTime dayEnd = ZonedDateTime.of(date, WORK_END, zone);

        DateTime timeMin = new DateTime(Date.from(dayStart.toInstant()));
        DateTime timeMax = new DateTime(Date.from(dayEnd.toInstant()));

        List<TimePeriod> busy = calendar.freeBusy(timeMin, timeMax);
        if (busy == null) busy = Collections.emptyList();

        List<ZonedDateTime> slots = new ArrayList<>();
        ZonedDateTime current = dayStart;

        while (!current.plusMinutes(slotMinutes).isAfter(dayEnd)) {
            LocalTime t = current.toLocalTime();
            boolean inLunch = (t.equals(LUNCH_START) || (t.isAfter(LUNCH_START) && t.isBefore(LUNCH_END)));
            if (!inLunch) {
                Instant slotStart = current.toInstant();
                Instant slotEnd = current.plusMinutes(slotMinutes).toInstant();

                boolean conflict = false;
                for (TimePeriod tp : busy) {
                    if (tp.getStart() == null || tp.getEnd() == null) continue;
                    Instant busyStart = Instant.ofEpochMilli(tp.getStart().getValue());
                    Instant busyEnd = Instant.ofEpochMilli(tp.getEnd().getValue());
                    if (!(slotEnd.compareTo(busyStart) <= 0 || slotStart.compareTo(busyEnd) >= 0)) {
                        conflict = true;
                        break;
                    }
                }
                if (!conflict) slots.add(current);
            }
            current = current.plusMinutes(slotMinutes);
        }

        return slots.stream().map(z -> z.toOffsetDateTime().toString()).collect(Collectors.toList());
    }

    // helpers
    private Instant extractInstant(EventDateTime edt) {
        if (edt == null) return null;
        DateTime dt = edt.getDateTime();
        if (dt == null) dt = edt.getDate();
        if (dt == null) return null;
        return Instant.ofEpochMilli(dt.getValue());
    }

    private Servico mapEventToServico(Event e) {
        Servico s = new Servico();
        s.setEventId(e.getId());
        s.setEventLink(e.getHtmlLink());
        s.setTitle(e.getSummary());
        s.setDescription(e.getDescription());

        s.setStart(extractInstant(e.getStart()));
        s.setEnd(extractInstant(e.getEnd()));

        Map<String, String> ext = (e.getExtendedProperties() != null && e.getExtendedProperties().getPrivate() != null)
                ? e.getExtendedProperties().getPrivate()
                : Collections.emptyMap();

        s.setClientFirstName(ext.getOrDefault("clientFirstName", ""));
        s.setClientLastName(ext.getOrDefault("clientLastName", ""));
        s.setClientEmail(ext.getOrDefault("clientEmail", ""));
        s.setClientPhone(ext.getOrDefault("clientPhone", ""));
        s.setClientAddress(ext.getOrDefault("clientAddress", ""));

        s.setStatus("AGENDADO");
        return s;
    }
}
