package com.example.Calendar.service;

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

    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    private final CalendarClient calendar;
    private final PendingStore pendingStore;
    private final VerificationStore verificationStore;
    private final HistoryStore historyStore;

    public record CleanupResult(
            int calendarDeleted,
            int pendingDeleted,
            int historyDeleted
    ) {}

    public InternalCleanupService(
            CalendarClient calendar,
            PendingStore pendingStore,
            VerificationStore verificationStore,
            HistoryStore historyStore
    ) {
        this.calendar = calendar;
        this.pendingStore = pendingStore;
        this.verificationStore = verificationStore;
        this.historyStore = historyStore;
    }

    public CleanupResult runDefault(long historyRetentionSeconds) throws IOException {
        long now = Instant.now().getEpochSecond();

        int cal = cleanupExpiredPendingsInCalendar();
        int pend = pendingStore.deleteExpired(now);

        verificationStore.cleanupExpired();

        int hist = 0;
        if (historyRetentionSeconds > 0) {
            long olderThan = now - historyRetentionSeconds;
            hist = historyStore.deleteOlderThan(olderThan);
        }

        return new CleanupResult(cal, pend, hist);
    }

    public int cleanupExpiredPendingsInCalendar() throws IOException {
        ZonedDateTime base = ZonedDateTime.now(ZONE).withDayOfMonth(1).toLocalDate().atStartOfDay(ZONE);
        ZonedDateTime from = base.minusMonths(1);
        ZonedDateTime to = base.plusMonths(2);

        List<Event> events = calendar.listBookingEvents(
                new DateTime(Date.from(from.toInstant())),
                new DateTime(Date.from(to.toInstant()))
        );
        if (events == null || events.isEmpty()) return 0;

        int deleted = 0;
        long now = Instant.now().getEpochSecond();

        for (Event e : events) {
            Map<String, String> ext = privateExt(e);
            if (!"PENDING_PHONE".equalsIgnoreCase(ext.getOrDefault("status", ""))) continue;

            String pe = ext.get("pendingExpiresAt");
            if (pe == null || !pe.matches("\\d+")) continue;

            long exp = Long.parseLong(pe);
            if (now > exp) {
                calendar.deleteEvent(e.getId());
                deleted++;
            }
        }
        return deleted;
    }

    private static Map<String, String> privateExt(Event e) {
        if (e.getExtendedProperties() == null) return Collections.emptyMap();
        if (e.getExtendedProperties().getPrivate() == null) return Collections.emptyMap();
        return e.getExtendedProperties().getPrivate();
    }
}