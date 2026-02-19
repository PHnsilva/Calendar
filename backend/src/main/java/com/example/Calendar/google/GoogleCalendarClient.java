package com.example.Calendar.google;

import com.example.Calendar.model.Servico;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.*;
import com.google.api.client.googleapis.json.GoogleJsonResponseException;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.ZoneId;
import java.util.*;

/**
 * Opção 2: mesmo calendário do proprietário, mas eventos do sistema são
 * marcados e filtrados.
 *
 * - freeBusy: considera TUDO (pessoais + sistema)
 * - listEvents: retorna SOMENTE eventos do sistema
 * - delete/update/get: podem validar se é evento do sistema (opcional/seguro)
 */
public class GoogleCalendarClient implements CalendarClient {
    private static final JsonFactory JSON_FACTORY = JacksonFactory.getDefaultInstance();
    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    // TAG fixa do sistema
    private static final String APP_KEY = "appSource";
    private static final String APP_VALUE = "calendar-backend"; // pode trocar o texto se quiser

    private final Calendar service;
    private final String calendarId;

    public GoogleCalendarClient(String clientId, String clientSecret, String refreshToken,
            String calendarId, String appName) throws GeneralSecurityException, IOException {
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
    public Event createEvent(Servico s) throws IOException {
        Event ev = new Event()
                .setSummary(s.getTitle())
                .setDescription(s.getDescription())
                .setLocation(s.getClientAddress());

        // extended properties (inclui a TAG do sistema + dados do cliente)
        Map<String, String> ext = new HashMap<>();
        ext.put(APP_KEY, APP_VALUE);

        ext.put("clientFirstName", safe(s.getClientFirstName()));
        ext.put("clientLastName", safe(s.getClientLastName()));
        ext.put("clientEmail", safe(s.getClientEmail()));
        ext.put("clientPhone", safe(s.getClientPhone()));
        ext.put("clientAddress", safe(s.getClientAddress()));

        ev.setExtendedProperties(new Event.ExtendedProperties().setPrivate(ext));

        // start/end
        DateTime start = new DateTime(Date.from(s.getStart()));
        DateTime end = new DateTime(Date.from(s.getEnd()));
        ev.setStart(new EventDateTime().setDateTime(start).setTimeZone(ZONE.toString()));
        ev.setEnd(new EventDateTime().setDateTime(end).setTimeZone(ZONE.toString()));

        // attendee (cliente)
        if (s.getClientEmail() != null && !s.getClientEmail().isBlank()) {
            EventAttendee attendee = new EventAttendee()
                    .setEmail(s.getClientEmail())
                    .setDisplayName((safe(s.getClientFirstName()) + " " + safe(s.getClientLastName())).trim());
            ev.setAttendees(Collections.singletonList(attendee));
        }

        // insere
        return service.events()
                .insert(calendarId, ev)
                .setSendUpdates("none")
                .execute();
    }

    @Override
    public void deleteEvent(String eventId) throws IOException {
        Event e = getEvent(eventId);
        if (e == null)
            return; // já não existe

        if (!isSystemEvent(e)) {
            throw new IllegalArgumentException("Evento não pertence ao sistema (não será apagado).");
        }

        service.events().delete(calendarId, eventId).execute();
    }

    @Override
    public Event updateEvent(Servico s) throws IOException {
        Event event = service.events().get(calendarId, s.getEventId()).execute();

        // Segurança extra: só atualiza se for evento do sistema
        if (!isSystemEvent(event)) {
            throw new IllegalArgumentException("Evento não pertence ao sistema (não será atualizado).");
        }

        event.setSummary(s.getTitle());
        event.setDescription(s.getDescription());
        event.setLocation(s.getClientAddress());

        Map<String, String> ext = privateProps(event);
        ext.put(APP_KEY, APP_VALUE); // garante a tag mesmo em update

        ext.put("clientFirstName", safe(s.getClientFirstName()));
        ext.put("clientLastName", safe(s.getClientLastName()));
        ext.put("clientEmail", safe(s.getClientEmail()));
        ext.put("clientPhone", safe(s.getClientPhone()));
        ext.put("clientAddress", safe(s.getClientAddress()));

        event.setExtendedProperties(new Event.ExtendedProperties().setPrivate(ext));

        EventDateTime start = new EventDateTime()
                .setDateTime(new DateTime(Date.from(s.getStart())))
                .setTimeZone(ZONE.toString());
        EventDateTime end = new EventDateTime()
                .setDateTime(new DateTime(Date.from(s.getEnd())))
                .setTimeZone(ZONE.toString());
        event.setStart(start);
        event.setEnd(end);

        return service.events()
                .update(calendarId, event.getId(), event)
                .setSendUpdates("none")
                .execute();
    }

    @Override
    public Event getEvent(String eventId) throws IOException {
        try {
            Event e = service.events().get(calendarId, eventId)
                    // garante que traz o status (defensivo)
                    .setFields("id,status,summary,description,htmlLink,start,end,extendedProperties")
                    .execute();

            // Se o evento foi "apagado" e o Google manteve como cancelled, trate como
            // inexistente
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

    /**
     * IMPORTANTE: aqui é onde a separação acontece:
     * listEvents retorna SOMENTE eventos criados pelo sistema (com a TAG).
     */
    @Override
    public List<Event> listEvents(DateTime timeMin, DateTime timeMax) throws IOException {
        Events events = service.events().list(calendarId)
                .setTimeMin(timeMin)
                .setTimeMax(timeMax)
                .setOrderBy("startTime")
                .setSingleEvents(true)
                .setShowDeleted(false) // <- evita retornar "cancelled"/deletados
                .setFields("items(id,status,summary,description,htmlLink,start,end,extendedProperties),nextPageToken")
                .execute();

        List<Event> items = events.getItems();
        if (items == null)
            return Collections.emptyList();

        List<Event> onlySystem = new ArrayList<>();
        for (Event e : items) {
            // defensivo: mesmo com showDeleted(false), filtre cancelados
            if ("cancelled".equalsIgnoreCase(e.getStatus()))
                continue;
            if (isSystemEvent(e))
                onlySystem.add(e);
        }
        return onlySystem;
    }

    /**
     * freeBusy NÃO filtra: precisa considerar eventos pessoais também,
     * senão você deixa cliente marcar em cima de compromisso do proprietário.
     */
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
}
