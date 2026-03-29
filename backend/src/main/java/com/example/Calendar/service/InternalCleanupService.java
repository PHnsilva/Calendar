package com.example.Calendar.service;

import com.example.Calendar.config.AppProperties;
import com.example.Calendar.google.CalendarClient;
import com.example.Calendar.service.store.HistoryStore;
import com.example.Calendar.service.store.PendingStore;
import com.example.Calendar.service.store.VerificationStore;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.Event;

import java.io.IOException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;

public class InternalCleanupService {

    private final CalendarClient calendarClient;
    private final PendingStore pendingStore;
    private final VerificationStore verificationStore;
    private final HistoryStore historyStore;
    private final AppProperties props;

    public record CleanupResult(
            int calendarDeleted,
            int pendingDeleted,
            int historyDeleted
    ) {
    }

    public InternalCleanupService(
            CalendarClient calendarClient,
            PendingStore pendingStore,
            VerificationStore verificationStore,
            HistoryStore historyStore,
            AppProperties props
    ) {
        this.calendarClient = calendarClient;
        this.pendingStore = pendingStore;
        this.verificationStore = verificationStore;
        this.historyStore = historyStore;
        this.props = props;
    }

    public CleanupResult runDefault(Integer historyRetentionMonthsOverride) throws IOException {
        long now = Instant.now().getEpochSecond();

        int retentionMonths = historyRetentionMonthsOverride == null
                ? props.getHistoryRetentionMonths()
                : Math.max(0, historyRetentionMonthsOverride);

        Instant keepFromInclusive = retentionStart(retentionMonths);

        int calendarDeleted = cleanupExpiredPendingsInCalendar();
        calendarDeleted += cleanupHistoricalBookingsBefore(keepFromInclusive);

        int pendingDeleted = pendingStore.deleteExpired(now);
        verificationStore.cleanupExpired();

        int historyDeleted = historyStore.deleteOlderThan(keepFromInclusive.getEpochSecond());

        return new CleanupResult(calendarDeleted, pendingDeleted, historyDeleted);
    }

    public int cleanupExpiredPendingsInCalendar() throws IOException {
        ZonedDateTime base = ZonedDateTime.now(zone()).withDayOfMonth(1).toLocalDate().atStartOfDay(zone());
        ZonedDateTime from = base.minusMonths(props.getHistoryRetentionMonths());
        ZonedDateTime to = base.plusMonths(props.getBookingMaxFutureMonthsAhead() + 1L);

        List<Event> events = calendarClient.listBookingEvents(
                new DateTime(Date.from(from.toInstant())),
                new DateTime(Date.from(to.toInstant()))
        );

        if (events == null || events.isEmpty()) {
            return 0;
        }

        int deleted = 0;
        long now = Instant.now().getEpochSecond();

        for (Event e : events) {
            Map<String, String> ext = privateExt(e);
            if (!"PENDING_PHONE".equalsIgnoreCase(ext.getOrDefault("status", ""))) {
                continue;
            }

            String pe = ext.get("pendingExpiresAt");
            if (pe == null || !pe.matches("\\d+")) {
                continue;
            }

            long exp = Long.parseLong(pe);
            if (now > exp) {
                pendingStore.deleteByEventId(e.getId());
                calendarClient.deleteEvent(e.getId());
                deleted++;
            }
        }

        return deleted;
    }

    private int cleanupHistoricalBookingsBefore(Instant keepFromInclusive) throws IOException {
        ZonedDateTime from = ZonedDateTime.ofInstant(Instant.EPOCH, zone());
        ZonedDateTime to = ZonedDateTime.ofInstant(keepFromInclusive, zone());

        List<Event> events = calendarClient.listBookingEvents(
                new DateTime(Date.from(from.toInstant())),
                new DateTime(Date.from(to.toInstant()))
        );

        if (events == null || events.isEmpty()) {
            return 0;
        }

        int deleted = 0;
        for (Event e : events) {
            Instant start = null;

            if (e.getStart() != null && e.getStart().getDateTime() != null) {
                start = Instant.ofEpochMilli(e.getStart().getDateTime().getValue());
            }

            if (start != null && start.isBefore(keepFromInclusive)) {
                pendingStore.deleteByEventId(e.getId());
                calendarClient.deleteEvent(e.getId());
                deleted++;
            }
        }

        return deleted;
    }

    private static Map<String, String> privateExt(Event e) {
        if (e.getExtendedProperties() == null) {
            return Collections.emptyMap();
        }
        if (e.getExtendedProperties().getPrivate() == null) {
            return Collections.emptyMap();
        }
        return e.getExtendedProperties().getPrivate();
    }

    private Instant retentionStart(int retentionMonths) {
        ZonedDateTime base = ZonedDateTime.now(zone()).withDayOfMonth(1).toLocalDate().atStartOfDay(zone());
        return base.minusMonths(retentionMonths).toInstant();
    }

    private ZoneId zone() {
        return props.getZoneId();
    }
}
