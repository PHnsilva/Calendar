package com.example.Calendar.google;

import com.example.Calendar.model.Servico;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.api.services.calendar.model.TimePeriod;

import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class DummyCalendarClient implements CalendarClient {

    private final Map<String, Event> store = new ConcurrentHashMap<>();

    @Override
    public Event createEvent(Servico s) throws IOException {
        String id = "dummy-" + UUID.randomUUID();

        Event ev = new Event();
        ev.setId(id);
        ev.setSummary(safe(s.getTitle()));
        ev.setDescription(safe(s.getDescription()));
        ev.setHtmlLink("http://localhost/dummy/event/" + id);

        // start/end (essencial para available/freeBusy)
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

    @Override
    public void deleteEvent(String eventId) throws IOException {
        store.remove(eventId);
    }

    @Override
    public Event updateEvent(Servico s) throws IOException {
        String id = s.getEventId();
        if (id == null || id.isBlank())
            throw new IllegalArgumentException("eventId é obrigatório para atualizar");

        Event ev = store.get(id);
        if (ev == null)
            return null;

        ev.setSummary(safe(s.getTitle()));
        ev.setDescription(safe(s.getDescription()));

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
            if (!isSystemEvent(e))
                continue;

            Instant start = eventStartInstant(e);
            if (start == null)
                continue;

            if (!start.isBefore(min) && start.isBefore(max)) {
                out.add(e);
            }
        }

        out.sort(Comparator.comparing((Event e) -> DummyCalendarClient.eventStartInstant(e),
                Comparator.nullsLast(Comparator.naturalOrder())));
        return out;
    }

    @Override
    public List<Event> listBookingEvents(DateTime timeMin, DateTime timeMax) throws IOException {
        List<Event> all = listEvents(timeMin, timeMax);
        List<Event> out = new ArrayList<>();
        for (Event e : all) {
            if (isBookingEvent(e))
                out.add(e);
        }
        return out;
    }

    @Override
    public List<Event> listAvailabilityBlockEvents(DateTime timeMin, DateTime timeMax) throws IOException {
        List<Event> all = listEvents(timeMin, timeMax);
        List<Event> out = new ArrayList<>();
        for (Event e : all) {
            if (isAvailabilityBlockEvent(e))
                out.add(e);
        }
        return out;
    }

    @Override
    public List<Event> listEventsByPhone(DateTime timeMin, DateTime timeMax, String phoneDigits) throws IOException {
        String phone = (phoneDigits == null) ? "" : phoneDigits.replaceAll("\\D", "");

        List<Event> out = new ArrayList<>();
        for (Event e : listBookingEvents(timeMin, timeMax)) {
            Map<String, String> ext = privateProps(e);
            String p = ext.getOrDefault("clientPhone", "");
            if (phone.equals(p))
                out.add(e);
        }

        out.sort(Comparator.comparing((Event e) -> DummyCalendarClient.eventStartInstant(e),
                Comparator.nullsLast(Comparator.naturalOrder())));
        return out;
    }

    @Override
    public Event createAvailabilityBlockEvent(String blockType, Instant start, Instant end, String reason)
            throws IOException {
        String id = "dummy-block-" + UUID.randomUUID();

        Event ev = new Event();
        ev.setId(id);
        ev.setSummary(buildAvailabilityBlockSummary(blockType, reason));
        ev.setDescription(safe(reason));
        ev.setHtmlLink("http://localhost/dummy/event/" + id);
        ev.setStart(new EventDateTime().setDateTime(new DateTime(Date.from(start))));
        ev.setEnd(new EventDateTime().setDateTime(new DateTime(Date.from(end))));

        Map<String, String> ext = privateProps(ev);
        ext.put("appSource", "calendar-backend");
        ext.put("entityType", "availability-block");
        ext.put("blockType", safe(blockType).trim().toUpperCase(Locale.ROOT));
        ext.put("blockReason", safe(reason));
        ext.put("createdAt", String.valueOf(Instant.now().getEpochSecond()));
        ev.setExtendedProperties(new Event.ExtendedProperties().setPrivate(ext));

        store.put(id, ev);
        return ev;
    }

    private static String buildAvailabilityBlockSummary(String blockType, String reason) {
        String prefix = "DAY".equalsIgnoreCase(blockType) ? "[Bloqueio de dia]" : "[Bloqueio de horário]";
        String r = safe(reason);
        return r.isBlank() ? prefix : prefix + " " + r;
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

            if (s.isBefore(max) && en.isAfter(min)) {
                TimePeriod tp = new TimePeriod();
                tp.setStart(new DateTime(Date.from(s)));
                tp.setEnd(new DateTime(Date.from(en)));
                busy.add(tp);
            }
        }

        busy.sort(Comparator.comparing(tp -> toInstant(tp.getStart())));
        return busy;
    }

    // ===== helpers =====

    private static void applyPrivateProps(Event ev, Servico s) {
        Map<String, String> ext = privateProps(ev);
        // marca do sistema (para consistência com GoogleCalendarClient)
        ext.put("appSource", "calendar-backend");
        ext.put("entityType", "booking");
        // guardar serviceType limpo
        ext.put("serviceType", safe(s.getTitle()));

        // status + tempos
        ext.put("status", safe(s.getStatus()));

        if (s.getPendingExpiresAt() != null) {
            ext.put("pendingExpiresAt", String.valueOf(s.getPendingExpiresAt().getEpochSecond()));
        } else {
            ext.remove("pendingExpiresAt");
        }

        if (s.getPhoneVerifiedAt() != null) {
            ext.put("phoneVerifiedAt", String.valueOf(s.getPhoneVerifiedAt().getEpochSecond()));
        } else {
            ext.remove("phoneVerifiedAt");
        }

        // cliente
        ext.put("clientFirstName", safe(s.getClientFirstName()));
        ext.put("clientLastName", safe(s.getClientLastName()));
        ext.put("clientEmail", safe(s.getClientEmail()));
        ext.put("clientPhone", safe(s.getClientPhone()));

        // endereço estruturado (mesmo padrão do GoogleCalendarClient)
        ext.put("clientCep", safe(s.getClientCep()));
        ext.put("clientStreet", safe(s.getClientStreet()));
        ext.put("clientNeighborhood", safe(s.getClientNeighborhood()));
        ext.put("clientNumber", safe(s.getClientNumber()));
        ext.put("clientComplement", safe(s.getClientComplement()));
        ext.put("clientCity", safe(s.getClientCity()));
        ext.put("clientState", safe(s.getClientState()));

        ev.setExtendedProperties(new Event.ExtendedProperties().setPrivate(ext));
    }

    private static Map<String, String> privateProps(Event e) {
        if (e.getExtendedProperties() == null) {
            e.setExtendedProperties(new Event.ExtendedProperties());
        }
        Map<String, String> p = e.getExtendedProperties().getPrivate();
        return (p == null) ? new HashMap<>() : new HashMap<>(p);
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
            dt = e.getStart().getDate();
        if (dt == null)
            return null;
        return Instant.ofEpochMilli(dt.getValue());
    }

    private static Instant eventEndInstant(Event e) {
        if (e == null || e.getEnd() == null)
            return null;
        DateTime dt = e.getEnd().getDateTime();
        if (dt == null)
            dt = e.getEnd().getDate();
        if (dt == null)
            return null;
        return Instant.ofEpochMilli(dt.getValue());
    }

    private static String safe(String s) {
        return s == null ? "" : s;
    }

    private static boolean isSystemEvent(Event e) {
        Map<String, String> ext = privateProps(e);
        return "calendar-backend".equals(ext.get("appSource"));
    }

    private static boolean isBookingEvent(Event e) {
        String entityType = entityTypeOf(e);
        return entityType.isBlank() || "booking".equals(entityType);
    }

    private static boolean isAvailabilityBlockEvent(Event e) {
        return "availability-block".equals(entityTypeOf(e));
    }

    private static String entityTypeOf(Event e) {
        Map<String, String> ext = privateProps(e);
        String v = ext.getOrDefault("entityType", "");
        return v == null ? "" : v.trim().toLowerCase(Locale.ROOT);
    }
}