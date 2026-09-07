package br.com.calendarmate.google;

import br.com.calendarmate.model.Servico;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.*;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.time.ZoneId;
import java.util.*;

public class GoogleCalendarClient implements CalendarClient {
    private static final JsonFactory JSON_FACTORY = JacksonFactory.getDefaultInstance();
    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    private static final String APP_KEY = "appSource";
    private static final String APP_VALUE = "calendar-backend";
    private static final int GOOGLE_CONNECT_TIMEOUT_MS = 10_000;
    private static final int GOOGLE_READ_TIMEOUT_MS = 25_000;

    private static final String ENTITY_TYPE_KEY = "entityType";
    private static final String ENTITY_TYPE_BOOKING = "booking";
    private static final String ENTITY_TYPE_AVAILABILITY_RULE = "availability-rule";
    private static final String ENTITY_TYPE_LEGACY_AVAILABILITY_BLOCK = "availability-block";

    private final Calendar service;
    private final String calendarId;

    GoogleCalendarClient(Calendar service, String calendarId) {
        this.service = Objects.requireNonNull(service);
        this.calendarId = calendarId;
    }

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
        credential.refreshToken();

        HttpRequestInitializer requestInitializer = request -> {
            credential.initialize(request);
            request.setConnectTimeout(GOOGLE_CONNECT_TIMEOUT_MS);
            request.setReadTimeout(GOOGLE_READ_TIMEOUT_MS);
        };

        this.service = new Calendar.Builder(httpTransport, JSON_FACTORY, requestInitializer)
                .setApplicationName(appName)
                .build();
        this.calendarId = calendarId;
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
        ext.put("serviceType", safe(s.getTitle()));
        ext.put("serviceNotes", safe(s.getServiceNotes()));
        ext.put("status", safe(s.getStatus()));
        putInstantIfPresent(ext, "cancellationAt", s.getCancellationAt());
        putIfNotBlank(ext, "cancellationSource", s.getCancellationSource());

        if (s.getPendingExpiresAt() != null) {
            ext.put("pendingExpiresAt", String.valueOf(s.getPendingExpiresAt().getEpochSecond()));
        }
        if (s.getPhoneVerifiedAt() != null) {
            ext.put("phoneVerifiedAt", String.valueOf(s.getPhoneVerifiedAt().getEpochSecond()));
        }

        ext.put("clientFirstName", safe(s.getClientFirstName()));
        ext.put("clientLastName", safe(s.getClientLastName()));
        ext.put("clientEmail", safe(s.getClientEmail()));
        ext.put("clientPhone", safe(s.getClientPhone()));

        ext.put("clientCep", safe(s.getClientCep()));
        ext.put("clientStreet", safe(s.getClientStreet()));
        ext.put("clientNeighborhood", safe(s.getClientNeighborhood()));
        ext.put("clientNumber", safe(s.getClientNumber()));
        ext.put("clientComplement", safe(s.getClientComplement()));
        ext.put("clientCity", safe(s.getClientCity()));
        ext.put("clientState", safe(s.getClientState()));
        putDoubleIfPresent(ext, "clientLatitude", s.getClientLatitude());
        putDoubleIfPresent(ext, "clientLongitude", s.getClientLongitude());
        putInstantIfPresent(ext, "appointmentStart", s.getAppointmentStart());
        putInstantIfPresent(ext, "appointmentEnd", s.getAppointmentEnd());
        putIfNotBlank(ext, "assignedProviderId", s.getAssignedProviderId());
        putIfNotBlank(ext, "assignedProviderName", s.getAssignedProviderName());
        putIfNotBlank(ext, "assignedProviderPhone", s.getAssignedProviderPhone());

        ev.setExtendedProperties(new Event.ExtendedProperties().setPrivate(ext));

        DateTime start = new DateTime(Date.from(s.getStart()));
        DateTime end = new DateTime(Date.from(s.getEnd()));
        ev.setStart(new EventDateTime().setDateTime(start).setTimeZone(ZONE.toString()));
        ev.setEnd(new EventDateTime().setDateTime(end).setTimeZone(ZONE.toString()));

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
        ext.put("serviceNotes", safe(s.getServiceNotes()));
        ext.put("status", safe(s.getStatus()));
        putInstantIfPresent(ext, "cancellationAt", s.getCancellationAt());
        if (s.getCancellationSource() == null || s.getCancellationSource().isBlank()) {
            ext.remove("cancellationSource");
        } else {
            ext.put("cancellationSource", s.getCancellationSource().trim());
        }

        ext.put("clientFirstName", safe(s.getClientFirstName()));
        ext.put("clientLastName", safe(s.getClientLastName()));
        ext.put("clientEmail", safe(s.getClientEmail()));
        ext.put("clientPhone", safe(s.getClientPhone()));

        ext.put("clientCep", safe(s.getClientCep()));
        ext.put("clientStreet", safe(s.getClientStreet()));
        ext.put("clientNeighborhood", safe(s.getClientNeighborhood()));
        ext.put("clientNumber", safe(s.getClientNumber()));
        ext.put("clientComplement", safe(s.getClientComplement()));
        ext.put("clientCity", safe(s.getClientCity()));
        ext.put("clientState", safe(s.getClientState()));
        putDoubleIfPresent(ext, "clientLatitude", s.getClientLatitude());
        putDoubleIfPresent(ext, "clientLongitude", s.getClientLongitude());
        putInstantIfPresent(ext, "appointmentStart", s.getAppointmentStart());
        putInstantIfPresent(ext, "appointmentEnd", s.getAppointmentEnd());
        putIfNotBlank(ext, "assignedProviderId", s.getAssignedProviderId());
        putIfNotBlank(ext, "assignedProviderName", s.getAssignedProviderName());
        putIfNotBlank(ext, "assignedProviderPhone", s.getAssignedProviderPhone());

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
        event.setTransparency("CANCELLED".equalsIgnoreCase(s.getStatus()) ? "transparent" : "opaque");
        event.setStart(new EventDateTime().setDateTime(new DateTime(Date.from(s.getStart()))).setTimeZone(ZONE.toString()));
        event.setEnd(new EventDateTime().setDateTime(new DateTime(Date.from(s.getEnd()))).setTimeZone(ZONE.toString()));

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
    public Event cancelEvent(String eventId, Instant cancellationAt, String cancellationSource) throws IOException {
        Event existing = service.events().get(calendarId, eventId).execute();
        if (existing == null) {
            return null;
        }
        if (!isSystemEvent(existing)) {
            throw new IllegalArgumentException("Evento não pertence ao sistema (não será cancelado).");
        }

        Map<String, String> ext = privateProps(existing);
        ext.put("status", "CANCELLED");
        putInstantIfPresent(ext, "cancellationAt", cancellationAt);
        if (cancellationSource == null || cancellationSource.isBlank()) {
            ext.remove("cancellationSource");
        } else {
            ext.put("cancellationSource", cancellationSource.trim());
        }

        String serviceType = ext.getOrDefault("serviceType", existing.getSummary());
        existing.setSummary(withStatusInSummary(serviceType, "CANCELLED"));
        existing.getExtendedProperties().setPrivate(ext);
        existing.setTransparency("transparent");

        // NetHttpTransport does not support PATCH. PUT the complete event fetched
        // above so cancellation preserves times, attendees and shared metadata.
        return service.events()
                .update(calendarId, eventId, existing)
                .setSendUpdates("all")
                .execute();
    }

    @Override
    public void deleteEvent(String eventId) throws IOException {
        Event e = getEvent(eventId);
        if (e == null) return;

        if (!isSystemEvent(e)) {
            throw new IllegalArgumentException("Evento não pertence ao sistema (não será apagado).");
        }

        service.events().delete(calendarId, eventId).execute();
    }

    @Override
    public Event getEvent(String eventId) throws IOException {
        try {
            Event e = service.events().get(calendarId, eventId)
                    .setFields("id,status,summary,description,location,htmlLink,start,end,attendees,extendedProperties,transparency")
                    .execute();

            if (e != null && "cancelled".equalsIgnoreCase(e.getStatus())) {
                return null;
            }
            return e;

        } catch (GoogleJsonResponseException ex) {
            if (ex.getStatusCode() == 404) return null;
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
            if (isBookingEvent(e)) {
                out.add(e);
            }
        }
        return out;
    }

    @Override
    public List<Event> listAvailabilityRuleEvents(DateTime timeMin, DateTime timeMax) throws IOException {
        List<Event> items = listSystemEvents(timeMin, timeMax);
        List<Event> out = new ArrayList<>();
        for (Event e : items) {
            if (isAvailabilityRuleEvent(e)) {
                out.add(e);
            }
        }
        return out;
    }

    @Override
    public List<Event> listEventsByPhone(DateTime timeMin, DateTime timeMax, String phoneDigits) throws IOException {
        List<Event> items = listBookingEvents(timeMin, timeMax);
        if (items == null || items.isEmpty()) return Collections.emptyList();

        List<Event> out = new ArrayList<>();
        for (Event e : items) {
            Map<String, String> ext = privateProps(e);
            if (phoneDigits.equals(ext.getOrDefault("clientPhone", ""))) {
                out.add(e);
            }
        }
        return out;
    }

    @Override
    public Event createAvailabilityRuleEvent(String mode, String type, Instant start, Instant end, String reason) throws IOException {
        String normalizedMode = safe(mode).trim().toUpperCase(Locale.ROOT);
        String normalizedType = safe(type).trim().toUpperCase(Locale.ROOT);

        Event ev = new Event()
                .setSummary(buildAvailabilityRuleSummary(normalizedMode, normalizedType, reason))
                .setDescription(safe(reason));

        Map<String, String> ext = new HashMap<>();
        ext.put(APP_KEY, APP_VALUE);
        ext.put(ENTITY_TYPE_KEY, ENTITY_TYPE_AVAILABILITY_RULE);
        ext.put("ruleMode", normalizedMode);
        ext.put("blockType", normalizedType);
        ext.put("blockReason", safe(reason));
        ext.put("createdAt", String.valueOf(Instant.now().getEpochSecond()));

        ev.setExtendedProperties(new Event.ExtendedProperties().setPrivate(ext));
        ev.setStart(new EventDateTime().setDateTime(new DateTime(Date.from(start))).setTimeZone(ZONE.toString()));
        ev.setEnd(new EventDateTime().setDateTime(new DateTime(Date.from(end))).setTimeZone(ZONE.toString()));

        if ("OPEN".equals(normalizedMode)) {
            ev.setTransparency("transparent");
        } else {
            ev.setTransparency("opaque");
        }

        return service.events()
                .insert(calendarId, ev)
                .setSendUpdates("none")
                .execute();
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
            if (fb.getBusy() != null) return fb.getBusy();
        }
        return Collections.emptyList();
    }

    private List<Event> listSystemEvents(DateTime timeMin, DateTime timeMax) throws IOException {
        List<Event> onlySystem = new ArrayList<>();
        String pageToken = null;
        do {
            Calendar.Events.List request = service.events().list(calendarId)
                    .setTimeMin(timeMin)
                    .setTimeMax(timeMax)
                    .setOrderBy("startTime")
                    .setSingleEvents(true)
                    .setShowDeleted(false)
                    .setFields("items(id,status,summary,description,location,htmlLink,start,end,attendees,extendedProperties,transparency),nextPageToken");
            if (pageToken != null) request.setPageToken(pageToken);
            Events events = request.execute();
            List<Event> items = events.getItems();
            if (items != null) {
                for (Event e : items) {
                    if ("cancelled".equalsIgnoreCase(e.getStatus())) continue;
                    if (isSystemEvent(e)) onlySystem.add(e);
                }
            }
            pageToken = events.getNextPageToken();
        } while (pageToken != null && !pageToken.isBlank());
        return onlySystem;
    }

    private boolean isSystemEvent(Event e) {
        Map<String, String> ext = privateProps(e);
        return APP_VALUE.equals(ext.get(APP_KEY));
    }

    private boolean isBookingEvent(Event e) {
        String entityType = entityTypeOf(e);
        return entityType.isBlank() || ENTITY_TYPE_BOOKING.equals(entityType);
    }

    private boolean isAvailabilityRuleEvent(Event e) {
        String entityType = entityTypeOf(e);
        return ENTITY_TYPE_AVAILABILITY_RULE.equals(entityType)
                || ENTITY_TYPE_LEGACY_AVAILABILITY_BLOCK.equals(entityType);
    }

    private String entityTypeOf(Event e) {
        Map<String, String> ext = privateProps(e);
        return safe(ext.get(ENTITY_TYPE_KEY)).trim().toLowerCase(Locale.ROOT);
    }

    private Map<String, String> privateProps(Event e) {
        if (e.getExtendedProperties() == null) return new HashMap<>();
        Map<String, String> p = e.getExtendedProperties().getPrivate();
        return (p == null) ? new HashMap<>() : new HashMap<>(p);
    }

    private String safe(String s) {
        return s == null ? "" : s;
    }

    private void putIfNotBlank(Map<String, String> ext, String key, String value) {
        String safeValue = safe(value).trim();
        if (!safeValue.isBlank()) {
            ext.put(key, safeValue);
        }
    }

    private void putInstantIfPresent(Map<String, String> ext, String key, Instant value) {
        if (value == null) {
            ext.remove(key);
            return;
        }
        ext.put(key, value.toString());
    }

    private void putDoubleIfPresent(Map<String, String> ext, String key, Double value) {
        if (value == null || !Double.isFinite(value)) {
            ext.remove(key);
            return;
        }
        ext.put(key, String.valueOf(value));
    }

    private String withStatusInSummary(String title, String status) {
        String t = safe(title);
        String st = safe(status).toUpperCase(Locale.ROOT);

        if ("PENDING_PHONE".equals(st)) return t + " (Pendente confirmação)";
        if ("CONFIRMED".equals(st)) return t + " (Confirmado)";
        if ("CANCELLED".equals(st)) return t + " (Cancelado)";
        return t;
    }

    private String buildAvailabilityRuleSummary(String mode, String type, String reason) {
        String prefix;
        if ("OPEN".equals(mode)) {
            prefix = "DAY".equals(type) ? "[Abertura de dia]" : "[Abertura de horário]";
        } else {
            prefix = "DAY".equals(type) ? "[Bloqueio de dia]" : "[Bloqueio de horário]";
        }

        String r = safe(reason).trim();
        return r.isBlank() ? prefix : prefix + " " + r;
    }

    private String buildAddressLine(Servico s) {
        String street = safe(s.getClientStreet());
        String num = safe(s.getClientNumber());
        String comp = safe(s.getClientComplement());
        String neigh = safe(s.getClientNeighborhood());
        String city = safe(s.getClientCity());
        String state = safe(s.getClientState());
        String cep = safe(s.getClientCep());

        String base = street + ", " + num;
        if (!comp.isBlank()) base += " - " + comp;

        String tail = " - " + neigh + " - " + city + "/" + state;
        if (!cep.isBlank()) tail += " CEP: " + cep;

        return (base + tail).trim();
    }
}
