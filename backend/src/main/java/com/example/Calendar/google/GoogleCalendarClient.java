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

/**
 * Minimal Google Calendar client that authenticates using CLIENT_ID, CLIENT_SECRET and REFRESH_TOKEN (env vars)
 * and acts on the CALENDAR_ID (owner) configured in env var.
 */
public class GoogleCalendarClient implements CalendarClient {
    private static final JsonFactory JSON_FACTORY = JacksonFactory.getDefaultInstance();
    private final Calendar service;
    private final String calendarId;

    public GoogleCalendarClient(String clientId, String clientSecret, String refreshToken, String calendarId, String appName) throws GeneralSecurityException, IOException {
        NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();

        GoogleCredential credential = new GoogleCredential.Builder()
                .setTransport(httpTransport)
                .setJsonFactory(JSON_FACTORY)
                .setClientSecrets(clientId, clientSecret)
                .build();
        credential.setRefreshToken(refreshToken);
        // try to refresh immediately to ensure validity
        credential.refreshToken();

        this.service = new Calendar.Builder(httpTransport, JSON_FACTORY, credential)
                .setApplicationName(appName)
                .build();
        this.calendarId = calendarId;
    }

    public Event createEvent(Servico s) throws IOException {
        // build event and extended properties
        Event ev = new Event()
                .setSummary(s.getTitle())
                .setDescription(s.getDescription())
                .setLocation(s.getClientAddress());

        Map<String, String> ext = new HashMap<>();
        ext.put("clientFirstName", safe(s.getClientFirstName()));
        ext.put("clientLastName", safe(s.getClientLastName()));
        ext.put("clientEmail", safe(s.getClientEmail()));
        ext.put("clientPhone", safe(s.getClientPhone()));
        ext.put("clientAddress", safe(s.getClientAddress()));
        ev.setExtendedProperties(new Event.ExtendedProperties().setPrivate(ext));

        // start / end
        DateTime start = new DateTime(Date.from(s.getStart()));
        DateTime end = new DateTime(Date.from(s.getEnd()));
        EventDateTime startEd = new EventDateTime().setDateTime(start).setTimeZone(ZoneId.of("America/Sao_Paulo").toString());
        EventDateTime endEd = new EventDateTime().setDateTime(end).setTimeZone(ZoneId.of("America/Sao_Paulo").toString());
        ev.setStart(startEd);
        ev.setEnd(endEd);

        // attendee (client)
        EventAttendee attendee = new EventAttendee()
                .setEmail(s.getClientEmail())
                .setDisplayName((safe(s.getClientFirstName()) + " " + safe(s.getClientLastName())).trim());
        ev.setAttendees(Collections.singletonList(attendee));

        // reminder example
        EventReminder emailReminder = new EventReminder().setMethod("email").setMinutes(24 * 60); // 24h before
        ev.setReminders(new Event.Reminders().setUseDefault(false).setOverrides(Collections.singletonList(emailReminder)));

        // insert and request send updates
        Event created = service.events().insert(calendarId, ev).setSendUpdates("all").execute();
        return created;
    }

    public void deleteEvent(String eventId) throws IOException {
        service.events().delete(calendarId, eventId).execute();
    }

    public Event updateEvent(Servico s) throws IOException {
        Event event = service.events().get(calendarId, s.getEventId()).execute();
        event.setSummary(s.getTitle());
        event.setDescription(s.getDescription());
        event.setLocation(s.getClientAddress());

        Map<String, String> ext = event.getExtendedProperties() != null && event.getExtendedProperties().getPrivate() != null
                ? event.getExtendedProperties().getPrivate()
                : new HashMap<>();
        ext.put("clientFirstName", safe(s.getClientFirstName()));
        ext.put("clientLastName", safe(s.getClientLastName()));
        ext.put("clientEmail", safe(s.getClientEmail()));
        ext.put("clientPhone", safe(s.getClientPhone()));
        ext.put("clientAddress", safe(s.getClientAddress()));
        event.setExtendedProperties(new Event.ExtendedProperties().setPrivate(ext));

        EventDateTime start = new EventDateTime().setDateTime(new DateTime(Date.from(s.getStart()))).setTimeZone(ZoneId.of("America/Sao_Paulo").toString());
        EventDateTime end = new EventDateTime().setDateTime(new DateTime(Date.from(s.getEnd()))).setTimeZone(ZoneId.of("America/Sao_Paulo").toString());
        event.setStart(start);
        event.setEnd(end);

        Event updated = service.events().update(calendarId, event.getId(), event).setSendUpdates("all").execute();
        return updated;
    }

    public Event getEvent(String eventId) throws IOException {
        return service.events().get(calendarId, eventId).execute();
    }

    public List<Event> listEvents(DateTime timeMin, DateTime timeMax) throws IOException {
        Events events = service.events().list(calendarId)
                .setTimeMin(timeMin)
                .setTimeMax(timeMax)
                .setOrderBy("startTime")
                .setSingleEvents(true)
                .execute();
        return events.getItems();
    }

    public List<TimePeriod> freeBusy(DateTime timeMin, DateTime timeMax) throws IOException {
        FreeBusyRequest request = new FreeBusyRequest();
        request.setTimeMin(timeMin);
        request.setTimeMax(timeMax);
        request.setItems(Collections.singletonList(new FreeBusyRequestItem().setId(calendarId)));
        FreeBusyResponse resp = service.freebusy().query(request).execute();
        Map<String, FreeBusyCalendar> cals = resp.getCalendars();
        if (cals != null && cals.containsKey(calendarId)) {
            FreeBusyCalendar fb = cals.get(calendarId);
            return fb.getBusy();
        }
        return Collections.emptyList();
    }

    private String safe(String s) { return s == null ? "" : s; }
}
