package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.AvailableSlotResponse;
import br.com.calendarmate.dto.PublicBookingResponse;
import br.com.calendarmate.dto.ServicoCreateResponse;
import br.com.calendarmate.dto.ServicoRequest;
import br.com.calendarmate.dto.ServicoResponse;
import br.com.calendarmate.controller.ServicoController;
import br.com.calendarmate.exception.GlobalExceptionHandler;
import br.com.calendarmate.exception.NotFoundException;
import br.com.calendarmate.exception.ExternalServiceException;
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
import br.com.calendarmate.service.store.SupabaseBookingHistoryStore;
import br.com.calendarmate.integrations.supabase.SupabaseClient;
import br.com.calendarmate.service.store.VerificationStore;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.services.calendar.model.Event;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.client.RestTemplate;

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
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.doCallRealMethod;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;

class PublicBookingFlowTest {
    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");
    private static final String PHONE = "31999999999";

    @ParameterizedTest
    @ValueSource(ints = {403, 400, 503})
    void creationReturns201WhenTheHistoryProviderRejectsTheSnapshot(int upstreamStatus) throws Exception {
        RestTemplate http = new RestTemplate();
        MockRestServiceServer upstream = MockRestServiceServer.bindTo(http).build();
        upstream.expect(org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo(
                        "https://history.example.test/rest/v1/booking_history_records?on_conflict=event_id"))
                .andRespond(org.springframework.test.web.client.response.MockRestResponseCreators.withStatus(HttpStatus.valueOf(upstreamStatus)));
        BookingHistoryStore history = new SupabaseBookingHistoryStore(
                new SupabaseClient(http, "https://history.example.test", "sb_secret_test", "public"), null);
        DummyCalendarClient calendar = spy(new DummyCalendarClient());
        InMemoryPendingStore pending = spy(new InMemoryPendingStore());
        doThrow(new ExternalServiceException("Pending unavailable")).when(pending).deleteByEventId(any());
        AppProperties props = new AppProperties();
        ServicoService service = serviceWith(calendar, props, history, pending);
        ServicoRequest request = nextAvailableRequest(service, props, PHONE);
        ObjectMapper json = new ObjectMapper().findAndRegisterModules();
        var mvc = MockMvcBuilders.standaloneSetup(new ServicoController(service, null, null, null, null, null))
                .setControllerAdvice(new GlobalExceptionHandler()).build();

        var response = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/servicos")
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(request)))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isCreated())
                .andReturn().getResponse();
        ServicoCreateResponse created = json.readValue(response.getContentAsByteArray(), ServicoCreateResponse.class);

        assertEquals("CONFIRMED", created.getServico().getStatus());
        assertEquals(created.getServico().getEventId(), service.getByToken(created.getManageToken()).getEventId());
        verify(calendar).createEvent(any());
        verify(pending, never()).deleteByEventId(any());
        upstream.verify();
    }

    @ParameterizedTest
    @ValueSource(strings = {"READ", "WRITE", "CLEANUP", "ALL"})
    void historyStillReturnsCalendarRecordsWhenSecondaryStorageFails(String failure) throws IOException {
        DummyCalendarClient calendar = new DummyCalendarClient();
        InMemoryBookingHistoryStore history = spy(new InMemoryBookingHistoryStore());
        ExternalServiceException unavailable = new ExternalServiceException("History unavailable");
        if (failure.equals("READ") || failure.equals("ALL")) {
            doThrow(unavailable).when(history).list(any(), any(), any());
            doThrow(unavailable).when(history).listByPhone(any(), anyInt());
        }
        if (failure.equals("WRITE") || failure.equals("ALL")) doThrow(unavailable).when(history).upsert(any(), anyLong());
        if (failure.equals("CLEANUP") || failure.equals("ALL")) doThrow(unavailable).when(history).deleteOlderThan(any());
        LocalDate today = LocalDate.now(ZONE);
        Event event = calendar.createEvent(eventAt(today.minusDays(15).atTime(12, 0).atZone(ZONE), "CONFIRMED"));
        ServicoService service = serviceWith(calendar, new AppProperties(), history);

        assertEquals(event.getId(), service.listHistoryAdmin(owner(), today.minusDays(29), today, null, null).get(0).getEventId());
        assertEquals(event.getId(), service.listPublicBookingsByPhone(PHONE).get(0).getEventId());

        doCallRealMethod().when(history).upsert(any(), anyLong());
        doCallRealMethod().when(history).list(any(), any(), any());
        doCallRealMethod().when(history).listByPhone(any(), anyInt());
        doCallRealMethod().when(history).deleteOlderThan(any());
        service.listHistoryAdmin(owner(), today.minusDays(29), today, null, null);
        assertEquals(event.getId(), history.listByPhone(PHONE, 10).get(0).getEventId());
    }

    @Test
    void historyAndPublicLookupUseStoredRecordsWhenCalendarIsUnavailable() throws IOException {
        DummyCalendarClient calendar = spy(new DummyCalendarClient());
        InMemoryBookingHistoryStore history = new InMemoryBookingHistoryStore();
        LocalDate today = LocalDate.now(ZONE);
        ServicoResponse stored = storedBooking(
                "stored-booking",
                today.minusDays(5).atTime(12, 0).atZone(ZONE).toInstant(),
                PHONE,
                "CONFIRMED");
        history.upsert(stored, Instant.now().getEpochSecond());
        doThrow(new IOException("Calendar unavailable")).when(calendar).listBookingEvents(any(), any());
        doThrow(new IOException("Calendar unavailable")).when(calendar).listEventsByPhone(any(), any(), eq(PHONE));
        ServicoService service = serviceWith(calendar, new AppProperties(), history);

        assertEquals("stored-booking",
                service.listHistoryAdmin(owner(), today.minusDays(29), today, null, null).get(0).getEventId());
        assertEquals("stored-booking", service.listPublicBookingsByPhone(PHONE).get(0).getEventId());
    }

    @Test
    void futureBookingCancelledTodayAppearsInHistoryWithoutIncludingActiveFutureBookings() throws IOException {
        DummyCalendarClient calendar = new DummyCalendarClient();
        InMemoryBookingHistoryStore history = spy(new InMemoryBookingHistoryStore());
        ServicoService service = serviceWith(calendar, new AppProperties(), history);
        LocalDate today = LocalDate.now(ZONE);
        LocalDate eventDate = today.plusMonths(5);
        Event event = calendar.createEvent(eventAt(eventDate.atTime(12, 0).atZone(ZONE), "CONFIRMED"));
        calendar.createEvent(eventAt(today.plusDays(4).atTime(12, 0).atZone(ZONE), "CONFIRMED"));
        doThrow(new ExternalServiceException("History unavailable")).when(history).upsert(any(), anyLong());
        service.cancelPublicBooking(event.getId(), PHONE);
        doCallRealMethod().when(history).upsert(any(), anyLong());

        List<ServicoResponse> result = service.listHistoryAdmin(owner(), today.minusDays(29), today, null, null);

        assertEquals(1, result.size());
        assertEquals(event.getId(), result.get(0).getEventId());
        assertEquals("CANCELLED", result.get(0).getStatus());
        assertFalse(service.listPublicBookingsByPhone(PHONE).stream()
                .anyMatch(item -> event.getId().equals(item.getEventId())));
        assertTrue(service.listAllAdmin(eventDate, eventDate).isEmpty());
        assertEquals(event.getId(), history.listByPhone(PHONE, 10).get(0).getEventId());
        ServicoService restored = serviceWith(new DummyCalendarClient(), new AppProperties(), history);
        assertEquals(event.getId(), restored.listHistoryAdmin(owner(), today.minusDays(29), today, null, null).get(0).getEventId());
    }

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

    @ParameterizedTest
    @ValueSource(strings = {"PUBLIC", "TOKEN", "ADMIN"})
    void providerFailureKeepsBookingActiveAndRetryReleasesTheSlot(String audience) throws IOException {
        DummyCalendarClient calendar = spy(new DummyCalendarClient());
        InMemoryBookingHistoryStore history = new InMemoryBookingHistoryStore();
        ServicoService service = serviceWith(calendar, new AppProperties(), history);
        ZonedDateTime start = ZonedDateTime.now(ZONE).plusDays(3);
        Event event = calendar.createEvent(eventAt(start, "CONFIRMED"));
        history.upsert(storedBooking(event.getId(), start.toInstant(), PHONE, "CONFIRMED"), 0);
        doThrow(new IOException("Calendar unavailable")).when(calendar).cancelEvent(eq(event.getId()), any(), any());

        assertThrows(IOException.class, () -> cancelForAudience(service, event.getId(), audience));

        assertEquals("CONFIRMED", service.listPublicBookingsByPhone(PHONE).get(0).getStatus());
        assertEquals("CONFIRMED", history.listByPhone(PHONE, 10).get(0).getStatus());
        assertFalse(calendar.freeBusy(new com.google.api.client.util.DateTime(start.toInstant().toEpochMilli()),
                new com.google.api.client.util.DateTime(start.plusHours(1).toInstant().toEpochMilli())).isEmpty());

        doCallRealMethod().when(calendar).cancelEvent(eq(event.getId()), any(), any());
        cancelForAudience(service, event.getId(), audience);
        String cancellationAt = calendar.getEvent(event.getId()).getExtendedProperties().getPrivate().get("cancellationAt");
        clearInvocations(calendar);
        cancelForAudience(service, event.getId(), audience);

        assertTrue(service.listPublicBookingsByPhone(PHONE).isEmpty());
        assertEquals(cancellationAt, calendar.getEvent(event.getId()).getExtendedProperties().getPrivate().get("cancellationAt"));
        verify(calendar, never()).cancelEvent(any(), any(), any());
        assertTrue(calendar.freeBusy(new com.google.api.client.util.DateTime(start.toInstant().toEpochMilli()),
                new com.google.api.client.util.DateTime(start.plusHours(1).toInstant().toEpochMilli())).isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {"PUBLIC", "TOKEN", "ADMIN"})
    void secondaryStoreOutageDoesNotBlockCancellationAndRetryRepairsHistory(String audience) throws IOException {
        DummyCalendarClient calendar = new DummyCalendarClient();
        InMemoryBookingHistoryStore history = spy(new InMemoryBookingHistoryStore());
        InMemoryPendingStore pending = spy(new InMemoryPendingStore());
        ServicoService service = serviceWith(calendar, new AppProperties(), history, pending);
        ZonedDateTime start = ZonedDateTime.now(ZONE).plusDays(3);
        Event event = calendar.createEvent(eventAt(start, "CONFIRMED"));
        history.upsert(storedBooking(event.getId(), start.toInstant(), PHONE, "CONFIRMED"), 0);
        doThrow(new ExternalServiceException("History unavailable")).when(history).upsert(any(), anyLong());
        doThrow(new ExternalServiceException("History unavailable")).when(history).listByPhone(any(), anyInt());
        doThrow(new ExternalServiceException("Pending store unavailable")).when(pending).deleteByEventId(any());

        cancelForAudience(service, event.getId(), audience);

        assertEquals("CANCELLED", calendar.getEvent(event.getId()).getExtendedProperties().getPrivate().get("status"));
        doCallRealMethod().when(history).listByPhone(any(), anyInt());
        assertTrue(service.listPublicBookingsByPhone(PHONE).isEmpty());
        doCallRealMethod().when(history).upsert(any(), anyLong());
        doCallRealMethod().when(pending).deleteByEventId(any());
        cancelForAudience(service, event.getId(), audience);

        assertEquals("CANCELLED", history.listByPhone(PHONE, 10).get(0).getStatus());
        assertEquals(calendar.getEvent(event.getId()).getExtendedProperties().getPrivate().get("cancellationAt"),
                history.listByPhone(PHONE, 10).get(0).getCancellationAt().toString());
    }

    @Test
    void failedLegacyCancellationSnapshotDoesNotHideAnActiveCalendarEvent() throws IOException {
        DummyCalendarClient calendar = new DummyCalendarClient();
        InMemoryBookingHistoryStore history = new InMemoryBookingHistoryStore();
        ZonedDateTime start = ZonedDateTime.now(ZONE).plusDays(3);
        Event event = calendar.createEvent(eventAt(start, "CONFIRMED"));
        history.upsert(storedBooking(event.getId(), start.toInstant(), PHONE, "CANCELLED"), 0);
        ServicoService service = serviceWith(calendar, new AppProperties(), history);

        assertEquals("CONFIRMED", service.listPublicBookingsByPhone(PHONE).get(0).getStatus());
        assertEquals("CANCELLED", service.cancelPublicBooking(event.getId(), PHONE).getStatus());
    }

    private static void cancelForAudience(ServicoService service, String eventId, String audience) throws IOException {
        switch (audience) {
            case "PUBLIC" -> assertEquals("CANCELLED", service.cancelPublicBooking(eventId, PHONE).getStatus());
            case "TOKEN" -> service.cancelByToken(eventId, new TokenUtil("test-secret", 600).generate(eventId, "maria@example.test"));
            case "ADMIN" -> service.deleteByIdAdmin(eventId);
            default -> throw new IllegalArgumentException(audience);
        }
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
        return serviceWith(calendar, props, history, new InMemoryPendingStore());
    }

    private static ServicoService serviceWith(CalendarClient calendar, AppProperties props, BookingHistoryStore history, InMemoryPendingStore pending) {
        TokenUtil tokens = new TokenUtil("test-secret", 600);
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
