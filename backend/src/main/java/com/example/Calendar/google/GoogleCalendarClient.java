package com.example.Calendar.google;

import com.example.Calendar.model.Servico;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.*;
import com.google.api.client.util.DateTime;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

/**
 * GoogleCalendarClient - versão com TAG + FILTRO (Opção 1)
 *
 * - Todos os eventos do sistema recebem extendedProperties.private.app = APP_TAG
 * - listEvents() retorna apenas eventos com a tag do app
 * - getEvent() também valida a tag (pra não vazar evento pessoal)
 */
public class GoogleCalendarClient implements CalendarClient {
    private static final JsonFactory JSON_FACTORY = JacksonFactory.getDefaultInstance();
    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    // >>> TAG DO APP (pode virar ENV se quiser)
    private static final String APP_TAG_KEY = "app";
    private static final String APP_TAG_VALUE =
    System.getenv().getOrDefault("APP_TAG", "calendar-app");


    private final Calendar service;
    private final String calendarId;

    public GoogleCalendarClient(
            String clientId,
            String clientSecret,
            String refreshToken,
            String calendarId,
            String appName
    ) throws GeneralSecurityException, IOException {

        NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();

        GoogleCredential credential = new GoogleCredential.Builder()
                .setTransport(httpTransport)
                .setJsonFactory(JSON_FACTORY)
                .setClientSecrets(clientId, clientSecret)
                .build();

        credential.setRefreshToken(refreshToken);
        credential.refreshToken(); // valida logo de cara

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

        // extended properties (private) + TAG do app
        Map<String, String> ext = new HashMap<>();
        ext.put(APP_TAG_KEY, APP_TAG_VALUE);

        ext.put("clientFirstName", safe(s.getClientFirstName()));
        ext.put("clientLastName", safe(s.getClientLastName()));
        ext.put("clientEmail", safe(s.getClientEmail()));
        ext.put("clientPhone", safe(s.getClientPhone()));
        ext.put("clientAddress", safe(s.getClientAddress()));

        ev.setExtendedProperties(new Event.ExtendedProperties().setPrivate(ext));

        // start/end com timezone
        DateTime start = new DateTime(Date.from(s.getStart()));
        DateTime end = new DateTime(Date.from(s.getEnd()));
        ev.setStart(new EventDateTime().setDateTime(start).setTimeZone(ZONE.toString()));
        ev.setEnd(new EventDateTime().setDateTime(end).setTimeZone(ZONE.toString()));

        // attendee (cliente)
        EventAttendee attendee = new EventAttendee()
                .setEmail(s.getClientEmail())
                .setDisplayName((safe(s.getClientFirstName()) + " " + safe(s.getClientLastName())).trim());
        ev.setAttendees(Collections.singletonList(attendee));

        // lembrete exemplo
        EventReminder emailReminder = new EventReminder().setMethod("email").setMinutes(24 * 60);
        ev.setReminders(new Event.Reminders().setUseDefault(false).setOverrides(Collections.singletonList(emailReminder)));

        return service.events()
                .insert(calendarId, ev)
                .setSendUpdates("all")
                .execute();
    }

    @Override
    public void deleteEvent(String eventId) throws IOException {
        // opcional: validar tag antes de deletar, pra segurança extra
        Event e = service.events().get(calendarId, eventId).execute();
        if (!isAppEvent(e)) {
            throw new IllegalArgumentException("Evento não pertence ao sistema");
        }
        service.events().delete(calendarId, eventId).execute();
    }

    @Override
    public Event updateEvent(Servico s) throws IOException {
        Event event = service.events().get(calendarId, s.getEventId()).execute();

        // segurança: não atualizar evento pessoal
        if (!isAppEvent(event)) {
            throw new IllegalArgumentException("Evento não pertence ao sistema");
        }

        event.setSummary(s.getTitle());
        event.setDescription(s.getDescription());
        event.setLocation(s.getClientAddress());

        Map<String, String> ext =
                (event.getExtendedProperties() != null && event.getExtendedProperties().getPrivate() != null)
                        ? new HashMap<>(event.getExtendedProperties().getPrivate())
                        : new HashMap<>();

        // manter/forçar a TAG do app
        ext.put(APP_TAG_KEY, APP_TAG_VALUE);

        ext.put("clientFirstName", safe(s.getClientFirstName()));
        ext.put("clientLastName", safe(s.getClientLastName()));
        ext.put("clientEmail", safe(s.getClientEmail()));
        ext.put("clientPhone", safe(s.getClientPhone()));
        ext.put("clientAddress", safe(s.getClientAddress()));
        event.setExtendedProperties(new Event.ExtendedProperties().setPrivate(ext));

        event.setStart(new EventDateTime().setDateTime(new DateTime(Date.from(s.getStart()))).setTimeZone(ZONE.toString()));
        event.setEnd(new EventDateTime().setDateTime(new DateTime(Date.from(s.getEnd()))).setTimeZone(ZONE.toString()));

        return service.events()
                .update(calendarId, event.getId(), event)
                .setSendUpdates("all")
                .execute();
    }

    @Override
    public Event getEvent(String eventId) throws IOException {
        Event e = service.events().get(calendarId, eventId).execute();
        // se não for do app, trate como "não existe" pro seu sistema
        if (!isAppEvent(e)) return null;
        return e;
    }

    @Override
    public List<Event> listEvents(DateTime timeMin, DateTime timeMax) throws IOException {
        Events events = service.events().list(calendarId)
                .setTimeMin(timeMin)
                .setTimeMax(timeMax)
                .setOrderBy("startTime")
                .setSingleEvents(true)
                .execute();

        List<Event> items = events.getItems();
        if (items == null) return Collections.emptyList();

        // FILTRO: só eventos do app
        return items.stream()
                .filter(this::isAppEvent)
                .collect(Collectors.toList());
    }

    @Override
    public List<TimePeriod> freeBusy(DateTime timeMin, DateTime timeMax) throws IOException {
        FreeBusyRequest request = new FreeBusyRequest()
                .setTimeMin(timeMin)
                .setTimeMax(timeMax)
                .setItems(Collections.singletonList(new FreeBusyRequestItem().setId(calendarId)));

        FreeBusyResponse resp = service.freebusy().query(request).execute();
        Map<String, FreeBusyCalendar> cals = resp.getCalendars();

        if (cals != null && cals.containsKey(calendarId)) {
            FreeBusyCalendar fb = cals.get(calendarId);
            return fb.getBusy() != null ? fb.getBusy() : Collections.emptyList();
        }
        return Collections.emptyList();
    }

    // =====================
    // Helpers
    // =====================

    private boolean isAppEvent(Event e) {
        if (e == null) return false;
        Event.ExtendedProperties ep = e.getExtendedProperties();
        if (ep == null) return false;
        Map<String, String> priv = ep.getPrivate();
        if (priv == null) return false;
        return APP_TAG_VALUE.equals(priv.get(APP_TAG_KEY));
    }

    private String safe(String s) {
        return s == null ? "" : s;
    }
}
