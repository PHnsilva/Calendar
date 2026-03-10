package com.example.Calendar.google;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import com.example.Calendar.model.Servico;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventAttendee;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.api.services.calendar.model.Events;
import com.google.api.services.calendar.model.FreeBusyCalendar;
import com.google.api.services.calendar.model.FreeBusyRequest;
import com.google.api.services.calendar.model.FreeBusyRequestItem;
import com.google.api.services.calendar.model.FreeBusyResponse;
import com.google.api.services.calendar.model.TimePeriod;
import java.time.Instant;

public class GoogleCalendarClient implements CalendarClient {
    private static final JsonFactory JSON_FACTORY = JacksonFactory.getDefaultInstance();
    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    // TAG fixa do sistema
    private static final String APP_KEY = "appSource";
    private static final String APP_VALUE = "calendar-backend";
    private static final String ENTITY_TYPE_KEY = "entityType";
    private static final String ENTITY_TYPE_BOOKING = "booking";
    private static final String ENTITY_TYPE_AVAILABILITY_BLOCK = "availability-block";

    private final Calendar service;
    private final String calendarId;

    public GoogleCalendarClient(
            String clientId,
            String clientSecret,
            String refreshToken,
            String calendarId,
            String appName) throws GeneralSecurityException, IOException {
        NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();

        GoogleCredential credential = new GoogleCredential.Builder()
                .setTransport(httpTransport)
                .setJsonFactory(JSON_FACTORY)
                .setClientSecrets(clientId, clientSecret)
                .build();
        credential.setRefreshToken(refreshToken);
        credential.refreshToken();

        this.service = new Calendar.Builder(httpTransport, JSON_FACTORY, credential)
                .setApplicationName(appName)
                .build();
        this.calendarId = calendarId;
    }

    @Override
    public Event createAvailabilityBlockEvent(String blockType, Instant start, Instant end, String reason)
            throws IOException {
        Event ev = new Event()
                .setSummary(buildAvailabilityBlockSummary(blockType, reason))
                .setDescription(safe(reason));

        Map<String, String> ext = new HashMap<>();
        ext.put(APP_KEY, APP_VALUE);
        ext.put(ENTITY_TYPE_KEY, ENTITY_TYPE_AVAILABILITY_BLOCK);
        ext.put("blockType", safe(blockType).trim().toUpperCase(Locale.ROOT));
        ext.put("blockReason", safe(reason));
        ext.put("createdAt", String.valueOf(Instant.now().getEpochSecond()));

        ev.setExtendedProperties(new Event.ExtendedProperties().setPrivate(ext));
        ev.setStart(new EventDateTime().setDateTime(new DateTime(Date.from(start))).setTimeZone(ZONE.toString()));
        ev.setEnd(new EventDateTime().setDateTime(new DateTime(Date.from(end))).setTimeZone(ZONE.toString()));

        return service.events()
                .insert(calendarId, ev)
                .setSendUpdates("none")
                .execute();
    }

    private String buildAvailabilityBlockSummary(String blockType, String reason) {
        String prefix = "DAY".equalsIgnoreCase(blockType) ? "[Bloqueio de dia]" : "[Bloqueio de horário]";
        String r = safe(reason);
        return r.isBlank() ? prefix : prefix + " " + r;
    }

    @Override
    public Event createEvent(Servico s) throws IOException {
        Event ev = new Event()
                .setSummary(withStatusInSummary(s.getTitle(), s.getStatus()))
                .setDescription(s.getDescription())
                .setLocation(buildAddressLine(s));

        Map<String, String> ext = new HashMap<>();
        ext.put(APP_KEY, APP_VALUE);

        ext.put(ENTITY_TYPE_KEY, ENTITY_TYPE_BOOKING);

        // guardar "serviceType" limpo (pra reconstruir sem sufixo no summary)
        ext.put("serviceType", safe(s.getTitle()));

        // status/reserva
        ext.put("status", safe(s.getStatus()));
        if (s.getPendingExpiresAt() != null) {
            ext.put("pendingExpiresAt", String.valueOf(s.getPendingExpiresAt().getEpochSecond()));
        }
        if (s.getPhoneVerifiedAt() != null) {
            ext.put("phoneVerifiedAt", String.valueOf(s.getPhoneVerifiedAt().getEpochSecond()));
        }

        // cliente
        ext.put("clientFirstName", safe(s.getClientFirstName()));
        ext.put("clientLastName", safe(s.getClientLastName()));
        ext.put("clientEmail", safe(s.getClientEmail()));
        ext.put("clientPhone", safe(s.getClientPhone()));

        // endereço estruturado
        ext.put("clientCep", safe(s.getClientCep()));
        ext.put("clientStreet", safe(s.getClientStreet()));
        ext.put("clientNeighborhood", safe(s.getClientNeighborhood()));
        ext.put("clientNumber", safe(s.getClientNumber()));
        ext.put("clientComplement", safe(s.getClientComplement()));
        ext.put("clientCity", safe(s.getClientCity()));
        ext.put("clientState", safe(s.getClientState()));

        ev.setExtendedProperties(new Event.ExtendedProperties().setPrivate(ext));

        DateTime start = new DateTime(Date.from(s.getStart()));
        DateTime end = new DateTime(Date.from(s.getEnd()));
        ev.setStart(new EventDateTime().setDateTime(start).setTimeZone(ZONE.toString()));
        ev.setEnd(new EventDateTime().setDateTime(end).setTimeZone(ZONE.toString()));

        // e-mails como notificação (cliente e/ou dono)
        if (s.getClientEmail() != null && !s.getClientEmail().isBlank()) {
            EventAttendee attendee = new EventAttendee()
                    .setEmail(s.getClientEmail())
                    .setDisplayName((safe(s.getClientFirstName()) + " " + safe(s.getClientLastName())).trim());
            ev.setAttendees(Collections.singletonList(attendee));
        }

        return service.events()
                .insert(calendarId, ev)
                .setSendUpdates("all")
                .execute();
    }

    @Override
    public void deleteEvent(String eventId) throws IOException {
        Event e = getEvent(eventId);
        if (e == null)
            return;

        if (!isSystemEvent(e)) {
            throw new IllegalArgumentException("Evento não pertence ao sistema (não será apagado).");
        }

        service.events().delete(calendarId, eventId).execute();
    }

    @Override
    public Event updateEvent(Servico s) throws IOException {
        Event event = service.events().get(calendarId, s.getEventId()).execute();

        if (!isSystemEvent(event)) {
            throw new IllegalArgumentException("Evento não pertence ao sistema (não será atualizado).");
        }

        event.setSummary(withStatusInSummary(s.getTitle(), s.getStatus()));
        event.setDescription(s.getDescription());
        event.setLocation(buildAddressLine(s));

        Map<String, String> ext = privateProps(event);
        ext.put(APP_KEY, APP_VALUE);
        ext.put(ENTITY_TYPE_KEY, ENTITY_TYPE_BOOKING);
        ext.put("serviceType", safe(s.getTitle()));
        ext.put("status", safe(s.getStatus()));

        // cliente
        ext.put("clientFirstName", safe(s.getClientFirstName()));
        ext.put("clientLastName", safe(s.getClientLastName()));
        ext.put("clientEmail", safe(s.getClientEmail()));
        ext.put("clientPhone", safe(s.getClientPhone()));

        // endereço estruturado
        ext.put("clientCep", safe(s.getClientCep()));
        ext.put("clientStreet", safe(s.getClientStreet()));
        ext.put("clientNeighborhood", safe(s.getClientNeighborhood()));
        ext.put("clientNumber", safe(s.getClientNumber()));
        ext.put("clientComplement", safe(s.getClientComplement()));
        ext.put("clientCity", safe(s.getClientCity()));
        ext.put("clientState", safe(s.getClientState()));

        // reserva
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

        event.setExtendedProperties(new Event.ExtendedProperties().setPrivate(ext));

        event.setStart(new EventDateTime()
                .setDateTime(new DateTime(Date.from(s.getStart())))
                .setTimeZone(ZONE.toString()));

        event.setEnd(new EventDateTime()
                .setDateTime(new DateTime(Date.from(s.getEnd())))
                .setTimeZone(ZONE.toString()));

        // mantém notificação por e-mail pro cliente
        if (s.getClientEmail() != null && !s.getClientEmail().isBlank()) {
            EventAttendee attendee = new EventAttendee()
                    .setEmail(s.getClientEmail())
                    .setDisplayName((safe(s.getClientFirstName()) + " " + safe(s.getClientLastName())).trim());
            event.setAttendees(Collections.singletonList(attendee));
        }

        return service.events()
                .update(calendarId, event.getId(), event)
                .setSendUpdates("all")
                .execute();
    }

    @Override
    public Event getEvent(String eventId) throws IOException {
        try {
            Event e = service.events().get(calendarId, eventId)
                    .setFields("id,status,summary,description,location,htmlLink,start,end,attendees,extendedProperties")
                    .execute();

            if (e != null && "cancelled".equalsIgnoreCase(e.getStatus())) {
                return null;
            }
            return e;

        } catch (GoogleJsonResponseException ex) {
            if (ex.getStatusCode() == 404)
                return null;
            throw ex;
        }
    }

    @Override
    public List<Event> listEvents(DateTime timeMin, DateTime timeMax) throws IOException {
        return listSystemEvents(timeMin, timeMax);
    }

    @Override
    public List<Event> listBookingEvents(DateTime timeMin, DateTime timeMax) throws IOException {
        List<Event> items = listSystemEvents(timeMin, timeMax);
        List<Event> out = new ArrayList<>();
        for (Event e : items) {
            if (isBookingEvent(e))
                out.add(e);
        }
        return out;
    }

    @Override
    public List<Event> listAvailabilityBlockEvents(DateTime timeMin, DateTime timeMax) throws IOException {
        List<Event> items = listSystemEvents(timeMin, timeMax);
        List<Event> out = new ArrayList<>();
        for (Event e : items) {
            if (isAvailabilityBlockEvent(e))
                out.add(e);
        }
        return out;
    }

    @Override
    public List<Event> listEventsByPhone(DateTime timeMin, DateTime timeMax, String phoneDigits) throws IOException {
        List<Event> items = listBookingEvents(timeMin, timeMax);
        if (items == null || items.isEmpty())
            return Collections.emptyList();

        List<Event> out = new ArrayList<>();
        for (Event e : items) {
            Map<String, String> ext = privateProps(e);
            if (phoneDigits.equals(ext.getOrDefault("clientPhone", "")))
                out.add(e);
        }
        return out;
    }

    private List<Event> listSystemEvents(DateTime timeMin, DateTime timeMax) throws IOException {
        Events events = service.events().list(calendarId)
                .setTimeMin(timeMin)
                .setTimeMax(timeMax)
                .setOrderBy("startTime")
                .setSingleEvents(true)
                .setShowDeleted(false)
                .setFields(
                        "items(id,status,summary,description,location,htmlLink,start,end,attendees,extendedProperties),nextPageToken")
                .execute();

        List<Event> items = events.getItems();
        if (items == null)
            return Collections.emptyList();

        List<Event> onlySystem = new ArrayList<>();
        for (Event e : items) {
            if ("cancelled".equalsIgnoreCase(e.getStatus()))
                continue;
            if (isSystemEvent(e))
                onlySystem.add(e);
        }
        return onlySystem;
    }

    @Override
    public List<TimePeriod> freeBusy(DateTime timeMin, DateTime timeMax) throws IOException {
        FreeBusyRequest request = new FreeBusyRequest();
        request.setTimeMin(timeMin);
        request.setTimeMax(timeMax);
        request.setItems(Collections.singletonList(new FreeBusyRequestItem().setId(calendarId)));

        FreeBusyResponse resp = service.freebusy().query(request).execute();
        Map<String, FreeBusyCalendar> cals = resp.getCalendars();
        if (cals != null && cals.containsKey(calendarId)) {
            FreeBusyCalendar fb = cals.get(calendarId);
            if (fb.getBusy() != null)
                return fb.getBusy();
        }
        return Collections.emptyList();
    }

    // -------- helpers --------

    private boolean isSystemEvent(Event e) {
        Map<String, String> ext = privateProps(e);
        return APP_VALUE.equals(ext.get(APP_KEY));
    }

    private Map<String, String> privateProps(Event e) {
        if (e.getExtendedProperties() == null)
            return new HashMap<>();
        Map<String, String> p = e.getExtendedProperties().getPrivate();
        return (p == null) ? new HashMap<>() : new HashMap<>(p);
    }

    private String safe(String s) {
        return s == null ? "" : s;
    }

    private String withStatusInSummary(String title, String status) {
        String t = safe(title);
        String st = safe(status).toUpperCase(Locale.ROOT);

        if ("PENDING_PHONE".equals(st))
            return t + " (Pendente confirmação)";
        if ("CONFIRMED".equals(st))
            return t + " (Confirmado)";
        return t;
    }

    private String buildAddressLine(Servico s) {
        // Rua, Nº - Complemento - Bairro - Cidade/UF CEP: xxxxxxxx
        String street = safe(s.getClientStreet());
        String num = safe(s.getClientNumber());
        String comp = safe(s.getClientComplement());
        String neigh = safe(s.getClientNeighborhood());
        String city = safe(s.getClientCity());
        String state = safe(s.getClientState());
        String cep = safe(s.getClientCep());

        String base = street + ", " + num;
        if (!comp.isBlank())
            base += " - " + comp;

        String tail = " - " + neigh + " - " + city + "/" + state;
        if (!cep.isBlank())
            tail += " CEP: " + cep;

        return (base + tail).trim();
    }

    private boolean isBookingEvent(Event e) {
        String entityType = entityTypeOf(e);
        return entityType.isBlank() || ENTITY_TYPE_BOOKING.equals(entityType);
    }

    private boolean isAvailabilityBlockEvent(Event e) {
        return ENTITY_TYPE_AVAILABILITY_BLOCK.equals(entityTypeOf(e));
    }

    private String entityTypeOf(Event e) {
        Map<String, String> ext = privateProps(e);
        return safe(ext.get(ENTITY_TYPE_KEY)).trim().toLowerCase(Locale.ROOT);
    }

}