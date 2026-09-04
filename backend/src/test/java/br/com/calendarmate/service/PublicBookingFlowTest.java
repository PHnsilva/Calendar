package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.AvailableSlotResponse;
import br.com.calendarmate.dto.PublicBookingResponse;
import br.com.calendarmate.dto.ServicoCreateResponse;
import br.com.calendarmate.dto.ServicoRequest;
import br.com.calendarmate.dto.ServicoResponse;
import br.com.calendarmate.exception.NotFoundException;
import br.com.calendarmate.google.CalendarClient;
import br.com.calendarmate.google.DummyCalendarClient;
import br.com.calendarmate.integrations.OtpDeliveryClient;
import br.com.calendarmate.model.AdminPrincipal;
import br.com.calendarmate.model.AdminRole;
import br.com.calendarmate.model.AdminSession;
import br.com.calendarmate.model.AdminUser;
import br.com.calendarmate.model.Servico;
import br.com.calendarmate.service.store.AdminSessionStore;
import br.com.calendarmate.service.store.AdminUserStore;
import br.com.calendarmate.service.store.BookingHistoryStore;
import br.com.calendarmate.service.store.InMemoryBookingHistoryStore;
import br.com.calendarmate.service.store.InMemoryPendingStore;
import br.com.calendarmate.service.store.VerificationStore;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.services.calendar.model.Event;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;

class PublicBookingFlowTest {
    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");
    private static final String PHONE = "31999999999";

    @Test
    void createsAndFindsAllBookingsByNormalizedPhoneWithoutAManageToken() throws IOException {
        AppProperties props = new AppProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        InMemoryBookingHistoryStore history = new InMemoryBookingHistoryStore();
        ServicoService service = serviceWith(calendar, props, history);

        ServicoRequest firstRequest = nextAvailableRequest(service, props, "+55 (31) 99999-9999");
        ServicoCreateResponse first = service.create(firstRequest);
        ServicoRequest secondRequest = nextAvailableRequest(service, props, "31 99999-9999");
        ServicoCreateResponse second = service.create(secondRequest);

        List<PublicBookingResponse> result = service.listPublicBookingsByPhone("(31) 99999-9999");

        assertEquals(2, result.size());
        assertTrue(result.stream().anyMatch(item -> first.getServico().getEventId().equals(item.getEventId())));
        assertTrue(result.stream().anyMatch(item -> second.getServico().getEventId().equals(item.getEventId())));
        assertTrue(service.listPublicBookingsByPhone("31 98888-8888").isEmpty());
    }

    @Test
    void publicDtoContainsOnlyTheFourApprovedFields() throws Exception {
        AppProperties props = new AppProperties();
        ServicoService service = serviceWith(new DummyCalendarClient(), props, new InMemoryBookingHistoryStore());
        service.create(nextAvailableRequest(service, props, PHONE));

        PublicBookingResponse booking = service.listPublicBookingsByPhone(PHONE).get(0);
        Map<?, ?> json = new ObjectMapper().findAndRegisterModules().convertValue(booking, Map.class);

        assertEquals(Set.of("eventId", "serviceType", "start", "status"), json.keySet());
        assertFalse(json.containsKey("clientEmail"));
        assertFalse(json.containsKey("clientAddressLine"));
        assertFalse(json.containsKey("serviceNotes"));
    }

    @Test
    void rejectsCrossPhoneCancellationAndCancelsTheOwnerBookingIdempotently() throws IOException {
        AppProperties props = new AppProperties();
        DummyCalendarClient calendar = spy(new DummyCalendarClient());
        InMemoryBookingHistoryStore history = new InMemoryBookingHistoryStore();
        ServicoService service = serviceWith(calendar, props, history);
        ServicoCreateResponse created = service.create(nextAvailableRequest(service, props, PHONE));
        String eventId = created.getServico().getEventId();
        clearInvocations(calendar);

        assertThrows(NotFoundException.class, () -> service.cancelPublicBooking(eventId, "31988888888"));

        PublicBookingResponse first = service.cancelPublicBooking(eventId, "+55 31 99999-9999");
        PublicBookingResponse retry = service.cancelPublicBooking(eventId, PHONE);

        assertEquals("CANCELLED", first.getStatus());
        assertEquals("CANCELLED", retry.getStatus());
        assertEquals(eventId, retry.getEventId());
        assertEquals("CANCELLED", history.listByPhone(PHONE, 10).get(0).getStatus());
        verify(calendar).cancelEvent(eq(eventId), any(), eq("CUSTOMER_PHONE_LOOKUP"));
        verify(calendar, never()).deleteEvent(any());
        verify(calendar, never()).updateEvent(any());
        assertTrue(calendar.freeBusy(
                new com.google.api.client.util.DateTime(created.getServico().getStart().minusSeconds(1).toEpochMilli()),
                new com.google.api.client.util.DateTime(created.getServico().getEnd().plusSeconds(1).toEpochMilli())).isEmpty());
    }

    @Test
    void persistentHistoryKeepsLookupAndCancellationWorkingAfterCalendarRestart() throws IOException {
        AppProperties props = new AppProperties();
        InMemoryBookingHistoryStore persistentHistory = new InMemoryBookingHistoryStore();
        ServicoService firstProcess = serviceWith(new DummyCalendarClient(), props, persistentHistory);
        ServicoCreateResponse created = firstProcess.create(nextAvailableRequest(firstProcess, props, PHONE));

        ServicoService restartedProcess = serviceWith(new DummyCalendarClient(), props, persistentHistory);
        List<PublicBookingResponse> restored = restartedProcess.listPublicBookingsByPhone(PHONE);
        PublicBookingResponse cancelled = restartedProcess.cancelPublicBooking(created.getServico().getEventId(), PHONE);

        assertEquals(1, restored.size());
        assertEquals(created.getServico().getEventId(), restored.get(0).getEventId());
        assertEquals("CANCELLED", cancelled.getStatus());
    }

    @Test
    void lookupIsNotLimitedToTwentyBookings() throws IOException {
        AppProperties props = new AppProperties();
        InMemoryBookingHistoryStore history = new InMemoryBookingHistoryStore();
        Instant base = LocalDate.now(ZONE).atStartOfDay(ZONE).toInstant();
        for (int index = 0; index < 25; index++) {
            ServicoResponse item = storedBooking("stored-" + index, base.minusSeconds(index * 60L), PHONE, "CONFIRMED");
            history.upsert(item, Instant.now().getEpochSecond());
        }

        ServicoService service = serviceWith(new DummyCalendarClient(), props, history);

        assertEquals(25, service.listPublicBookingsByPhone(PHONE).size());
    }

    @Test
    void historyUsesThirtySaoPauloCalendarDaysIncludesRecentAndCancelledAndDeduplicates() throws IOException {
        AppProperties props = new AppProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        InMemoryBookingHistoryStore history = new InMemoryBookingHistoryStore();
        ServicoService service = serviceWith(calendar, props, history);
        LocalDate today = LocalDate.now(ZONE);

        Event outside = calendar.createEvent(eventAt(today.minusDays(30).atTime(23, 59).atZone(ZONE), "CONFIRMED"));
        Event firstBoundary = calendar.createEvent(eventAt(today.minusDays(29).atStartOfDay(ZONE), "CONFIRMED"));
        Event recent = calendar.createEvent(eventAt(today.minusDays(5).atTime(12, 0).atZone(ZONE), "CONFIRMED"));
        Event cancelled = calendar.createEvent(eventAt(today.atTime(23, 59).atZone(ZONE), "CANCELLED"));
        history.upsert(storedBooking(recent.getId(), today.minusDays(5).atTime(12, 0).atZone(ZONE).toInstant(), PHONE, "CONFIRMED"), Instant.now().getEpochSecond());

        List<ServicoResponse> result = service.listHistoryAdmin(owner(), today.minusDays(29), today, null, null);

        assertFalse(result.stream().anyMatch(item -> outside.getId().equals(item.getEventId())));
        assertTrue(result.stream().anyMatch(item -> firstBoundary.getId().equals(item.getEventId())));
        assertTrue(result.stream().anyMatch(item -> recent.getId().equals(item.getEventId())));
        assertTrue(result.stream().anyMatch(item -> cancelled.getId().equals(item.getEventId()) && "CANCELLED".equals(item.getStatus())));
        assertEquals(1, result.stream().filter(item -> recent.getId().equals(item.getEventId())).count());
        assertEquals(cancelled.getId(), result.get(0).getEventId());
    }

    @Test
    void createKeepsComplementSeparateAndUpdatePreservesNotesWhenOmitted() throws IOException {
        AppProperties props = new AppProperties();
        ServicoService service = serviceWith(new DummyCalendarClient(), props, new InMemoryBookingHistoryStore());
        ServicoRequest request = nextAvailableRequest(service, props, PHONE);
        request.setClientComplement("Apartment 12");
        request.setServiceNotes("Please ring the side bell on arrival.");
        ServicoCreateResponse created = service.create(request);

        ServicoRequest update = copyRequest(request);
        update.setClientEmail("updated@example.test");
        update.setServiceNotes(null);
        ServicoResponse updated = service.updateByToken(created.getServico().getEventId(), created.getManageToken(), update);

        assertEquals("Apartment 12", created.getServico().getClientComplement());
        assertEquals("Please ring the side bell on arrival.", created.getServico().getServiceNotes());
        assertEquals("Apartment 12", updated.getClientComplement());
        assertEquals("Please ring the side bell on arrival.", updated.getServiceNotes());
    }

    private static ServicoRequest nextAvailableRequest(ServicoService service, AppProperties props, String phone) throws IOException {
        LocalDate today = LocalDate.now(ZONE);
        for (int offset = 2; offset <= 45; offset++) {
            LocalDate date = today.plusDays(offset);
            List<AvailableSlotResponse> slots;
            try {
                slots = service.getAvailableSlots(date, "Itabirito", props.getBookingSlotMinutes());
            } catch (RuntimeException ignored) {
                continue;
            }
            if (!slots.isEmpty()) return request(date, LocalTime.parse(slots.get(0).getStartTime()), phone);
        }
        throw new IllegalStateException("No available booking slot for test");
    }

    private static ServicoRequest request(LocalDate date, LocalTime time, String phone) {
        ServicoRequest request = new ServicoRequest();
        request.setServiceType("Electrical service");
        request.setServiceNotes("Check the living room outlet.");
        request.setDate(date);
        request.setTime(time);
        request.setClientFirstName("Pedro");
        request.setClientLastName("Silva");
        request.setClientEmail("pedro@example.test");
        request.setClientPhone(phone);
        request.setClientCep("35450000");
        request.setClientStreet("Rua Sao Jose");
        request.setClientNeighborhood("Centro");
        request.setClientNumber("123");
        request.setClientCity("Itabirito");
        request.setClientState("MG");
        return request;
    }

    private static ServicoRequest copyRequest(ServicoRequest source) {
        ServicoRequest copy = request(source.getDate(), source.getTime(), source.getClientPhone());
        copy.setServiceType(source.getServiceType());
        copy.setServiceNotes(source.getServiceNotes());
        copy.setClientEmail(source.getClientEmail());
        copy.setClientComplement(source.getClientComplement());
        return copy;
    }

    private static Servico eventAt(ZonedDateTime start, String status) {
        Servico event = new Servico();
        event.setTitle("Electrical service");
        event.setServiceNotes("Administrative note");
        event.setDescription("Administrative note");
        event.setStart(start.toInstant());
        event.setEnd(start.plusHours(1).toInstant());
        event.setAppointmentStart(start.toInstant());
        event.setAppointmentEnd(start.plusHours(1).toInstant());
        event.setStatus(status);
        event.setClientFirstName("Maria");
        event.setClientLastName("Souza");
        event.setClientEmail("maria@example.test");
        event.setClientPhone(PHONE);
        event.setClientCity("Itabirito");
        event.setClientState("MG");
        return event;
    }

    private static ServicoResponse storedBooking(String id, Instant start, String phone, String status) {
        ServicoResponse item = new ServicoResponse();
        item.setEventId(id);
        item.setServiceType("Electrical service");
        item.setServiceNotes("Private administrative note");
        item.setStart(start);
        item.setEnd(start.plusSeconds(3600));
        item.setClientEmail("private@example.test");
        item.setClientPhone(phone);
        item.setClientAddressLine("Private address");
        item.setStatus(status);
        return item;
    }

    private static AdminPrincipal owner() {
        return new AdminPrincipal(new AdminUser("owner-1", PHONE, "Owner", AdminRole.OWNER, true, 0, 0), null);
    }

    private static ServicoService serviceWith(CalendarClient calendar, AppProperties props, BookingHistoryStore history) {
        TokenUtil tokens = new TokenUtil("test-secret", 600);
        InMemoryPendingStore pending = new InMemoryPendingStore();
        AdminAuthService auth = new AdminAuthService(new EmptyAdminUsers(), new EmptyAdminSessions(), new NoopVerificationStore(), codeDelivery(), props);
        VerificationService verification = new VerificationService(calendar, tokens, new NoopVerificationStore(), pending, codeDelivery(), props, auth);
        return new ServicoService(calendar, tokens, verification, pending, props, new AvailabilityPolicyService(calendar, props), auth, history);
    }

    private static OtpDeliveryClient codeDelivery() {
        return (phoneDigits, code) -> { };
    }

    private static final class EmptyAdminUsers implements AdminUserStore {
        public AdminUser findActiveByPhone(String phoneDigits) { return null; }
        public AdminUser findActiveById(String id) { return null; }
        public List<AdminUser> listActive() { return List.of(); }
        public void updateLastLogin(String id, long epochSec) { }
    }

    private static final class EmptyAdminSessions implements AdminSessionStore {
        public void save(AdminSession session) { }
        public AdminSession findActiveByTokenHash(String tokenHash, long nowEpochSec) { return null; }
        public void touch(String sessionId, long nowEpochSec) { }
        public void revokeByTokenHash(String tokenHash, long nowEpochSec) { }
        public int deleteExpired(long nowEpochSec) { return 0; }
    }

    private static final class NoopVerificationStore implements VerificationStore {
        public Session create(String scopeId, String phoneDigits, long otpTtlSeconds, long resendAfterSeconds) { return null; }
        public Session get(String verificationId) { return null; }
        public void delete(String verificationId) { }
        public Session refreshResend(String verificationId, long resendAfterSeconds) { return null; }
    }
}
