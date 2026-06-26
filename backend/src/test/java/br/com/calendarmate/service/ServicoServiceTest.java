package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.AvailabilityBlockCreateRequest;
import br.com.calendarmate.dto.AvailableSlotResponse;
import br.com.calendarmate.dto.ServicoRequest;
import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.exception.ExternalServiceException;
import br.com.calendarmate.exception.ForbiddenException;
import br.com.calendarmate.google.DummyCalendarClient;
import br.com.calendarmate.integrations.OtpDeliveryClient;
import br.com.calendarmate.model.AdminPrincipal;
import br.com.calendarmate.model.AdminRole;
import br.com.calendarmate.model.AdminSession;
import br.com.calendarmate.model.AdminUser;
import br.com.calendarmate.model.Servico;
import br.com.calendarmate.service.store.AdminSessionStore;
import br.com.calendarmate.service.store.AdminUserStore;
import br.com.calendarmate.service.store.InMemoryBookingHistoryStore;
import br.com.calendarmate.service.store.InMemoryPendingStore;
import br.com.calendarmate.service.store.VerificationStore;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.Event;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ServicoServiceTest {
    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    @Test
    void createCleansPendingEventAndVerificationSessionWhenOtpSendFails() throws IOException {
        AppProperties props = new AppProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        InMemoryPendingStore pendingStore = new InMemoryPendingStore();
        TrackingVerificationStore verificationStore = new TrackingVerificationStore();
        TokenUtil tokenUtil = new TokenUtil("test-secret", 600);
        AdminAuthService adminAuthService = adminAuthServiceWithoutAdmins();
        VerificationService verificationService = new VerificationService(
                calendar,
                tokenUtil,
                verificationStore,
                pendingStore,
                new FailingOtpDeliveryClient(),
                props,
                adminAuthService);
        ServicoService service = new ServicoService(
                calendar,
                tokenUtil,
                verificationService,
                pendingStore,
                props,
                new AvailabilityPolicyService(calendar, props),
                adminAuthService,
                new InMemoryBookingHistoryStore());

        assertThrows(ExternalServiceException.class, () -> service.create(validRequest(nextAvailableDate(calendar, props))));

        assertTrue(pendingStore.listByPhone("31999999999").isEmpty());
        assertNull(verificationStore.get("vfy_create"));
        assertTrue(calendar.listEventsByPhone(
                new DateTime(Date.from(LocalDate.now(ZONE).minusDays(1).atStartOfDay(ZONE).toInstant())),
                new DateTime(Date.from(LocalDate.now(ZONE).plusMonths(2).atStartOfDay(ZONE).toInstant())),
                "31999999999").isEmpty());
    }

    @Test
    void availableSlotsReturnOpenSlotsForAvailableDate() throws IOException {
        AppProperties props = new AppProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        ServicoService service = serviceWith(calendar, props);
        LocalDate date = nextAvailableDate(calendar, props);

        List<AvailableSlotResponse> slots = service.getAvailableSlots(date, "Itabirito", props.getBookingSlotMinutes());

        assertFalse(slots.isEmpty());
        assertTrue(slots.stream().allMatch(slot -> date.toString().equals(slot.getDate())));
        assertTrue(slots.stream().allMatch(slot -> slot.getStartTime().endsWith(":00")));
        assertTrue(slots.stream().allMatch(slot -> slot.getDurationMinutes() == props.getBookingSlotMinutes()));
    }

    @Test
    void availableSlotsRejectPastDate() {
        AppProperties props = new AppProperties();
        ServicoService service = serviceWith(new DummyCalendarClient(), props);

        BadRequestException ex = assertThrows(
                BadRequestException.class,
                () -> service.getAvailableSlots(LocalDate.now(ZONE).minusDays(1), "Itabirito", props.getBookingSlotMinutes()));

        assertTrue(ex.getMessage().contains("passado"));
    }

    @Test
    void createRejectsNonHourlyTimeBeforeCreatingCalendarEvent() throws IOException {
        AppProperties props = new AppProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        ServicoService service = serviceWith(calendar, props);
        ServicoRequest request = validRequest(nextAvailableDate(calendar, props));
        request.setTime(LocalTime.of(10, 30));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.create(request));

        assertTrue(ex.getMessage().contains("Minutos"));
        assertTrue(calendar.listBookingEvents(
                new DateTime(Date.from(LocalDate.now(ZONE).minusDays(1).atStartOfDay(ZONE).toInstant())),
                new DateTime(Date.from(LocalDate.now(ZONE).plusMonths(2).atStartOfDay(ZONE).toInstant()))).isEmpty());
    }

    @Test
    void availableSlotsExcludeOccupiedCalendarWindow() throws IOException {
        AppProperties props = new AppProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        ServicoService service = serviceWith(calendar, props);
        LocalDate date = nextAvailableDate(calendar, props);
        AvailableSlotResponse occupiedSlot = service.getAvailableSlots(date, "Itabirito", props.getBookingSlotMinutes()).get(0);

        calendar.createEvent(confirmedBooking(date, LocalTime.parse(occupiedSlot.getStartTime())));

        List<AvailableSlotResponse> remaining = service.getAvailableSlots(date, "Itabirito", props.getBookingSlotMinutes());

        assertFalse(remaining.stream().anyMatch(slot -> occupiedSlot.getStartTime().equals(slot.getStartTime())));
    }

    @Test
    void availabilityBlockRemovesBlockedSlotFromAvailableSlots() throws IOException {
        AppProperties props = new AppProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        ServicoService service = serviceWith(calendar, props);
        AvailabilityBlockService blocks = new AvailabilityBlockService(
                calendar,
                props,
                new AdminBookingOpsService(calendar, new InMemoryPendingStore(), props));
        LocalDate date = nextAvailableDate(calendar, props);
        AvailableSlotResponse blockedSlot = service.getAvailableSlots(date, "Itabirito", props.getBookingSlotMinutes()).get(0);
        LocalDateTime blockedStart = LocalDateTime.of(date, LocalTime.parse(blockedSlot.getStartTime()));

        AvailabilityBlockCreateRequest request = new AvailabilityBlockCreateRequest();
        request.setMode("BLOCK");
        request.setType("SLOT");
        request.setStartAt(blockedStart);
        request.setEndAt(blockedStart.plusMinutes(props.getBookingSlotMinutes()));
        request.setReason("Manutencao interna");

        assertEquals("BLOCK", blocks.create(request).getMode());

        List<AvailableSlotResponse> remaining = service.getAvailableSlots(date, "Itabirito", props.getBookingSlotMinutes());
        assertFalse(remaining.stream().anyMatch(slot -> blockedSlot.getStartTime().equals(slot.getStartTime())));
    }

    @Test
    void providerCanReadAndAccessOnlyAssignedActiveBookingsWhileOwnerCanAccessAll() throws IOException {
        AppProperties props = new AppProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        ServicoService service = serviceWith(calendar, props);
        LocalDate date = LocalDate.now(ZONE).plusDays(1);
        Event assigned = calendar.createEvent(confirmedBooking(date, LocalTime.of(9, 0), "provider-1"));
        Event unassigned = calendar.createEvent(confirmedBooking(date, LocalTime.of(10, 0), "provider-2"));
        AdminPrincipal owner = principal("owner-1", AdminRole.OWNER);
        AdminPrincipal provider = principal("provider-1", AdminRole.PROVIDER);

        assertEquals(2, service.listAllAdmin(owner, date, date, null, null).size());
        assertEquals(1, service.listAllAdmin(provider, date, date, null, null).size());
        assertEquals(assigned.getId(), service.listAllAdmin(provider, date, date, null, null).get(0).getEventId());
        assertDoesNotThrow(() -> service.requireActiveAdminAccess(assigned.getId(), provider));
        assertThrows(ForbiddenException.class, () -> service.requireActiveAdminAccess(unassigned.getId(), provider));
        assertDoesNotThrow(() -> service.requireActiveAdminAccess(unassigned.getId(), owner));
    }

    @Test
    void ownerProviderWorkspaceUsesSelectedProviderScopeForBookingAccess() throws IOException {
        AppProperties props = new AppProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        ServicoService service = serviceWith(calendar, props);
        LocalDate date = LocalDate.now(ZONE).plusDays(1);
        Event providerOne = calendar.createEvent(confirmedBooking(date, LocalTime.of(9, 0), "provider-1"));
        Event providerTwo = calendar.createEvent(confirmedBooking(date, LocalTime.of(10, 0), "provider-2"));
        AdminUser ownerUser = new AdminUser("owner-1", "31995438467", "Owner", AdminRole.OWNER, true, 0, 0);
        AdminUser providerUser = new AdminUser("provider-2", "31977777777", "Provider Two", AdminRole.PROVIDER, true, 0, 0);
        AdminPrincipal ownerAsProvider = new AdminPrincipal(ownerUser, providerUser, null);

        List<br.com.calendarmate.dto.ServicoResponse> visible = service.listAllAdmin(ownerAsProvider, date, date, null, null);

        assertEquals(1, visible.size());
        assertEquals(providerTwo.getId(), visible.get(0).getEventId());
        assertThrows(ForbiddenException.class, () -> service.requireActiveAdminAccess(providerOne.getId(), ownerAsProvider));
        assertDoesNotThrow(() -> service.requireActiveAdminAccess(providerTwo.getId(), ownerAsProvider));
    }

    private static ServicoService serviceWith(DummyCalendarClient calendar, AppProperties props) {
        TokenUtil tokenUtil = new TokenUtil("test-secret", 600);
        InMemoryPendingStore pendingStore = new InMemoryPendingStore();
        AdminAuthService adminAuthService = adminAuthServiceWithoutAdmins();
        VerificationService verificationService = new VerificationService(
                calendar,
                tokenUtil,
                new TrackingVerificationStore(),
                pendingStore,
                new NoopOtpDeliveryClient(),
                props,
                adminAuthService);
        return new ServicoService(
                calendar,
                tokenUtil,
                verificationService,
                pendingStore,
                props,
                new AvailabilityPolicyService(calendar, props),
                adminAuthService,
                new InMemoryBookingHistoryStore());
    }

    private static LocalDate nextAvailableDate(DummyCalendarClient calendar, AppProperties props) throws IOException {
        AvailabilityPolicyService policy = new AvailabilityPolicyService(calendar, props);
        LocalDate today = LocalDate.now(ZONE);
        YearMonth current = YearMonth.from(today);
        YearMonth next = current.plusMonths(1);
        for (int offset = 1; offset <= 45; offset++) {
            LocalDate candidate = today.plusDays(offset);
            YearMonth candidateMonth = YearMonth.from(candidate);
            if ((candidateMonth.equals(current) || candidateMonth.equals(next)) && policy.hasAnyAvailability(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("No available test date in booking window");
    }

    private static ServicoRequest validRequest(LocalDate date) {
        ServicoRequest req = new ServicoRequest();
        req.setServiceType("Visita tecnica");
        req.setServiceNotes("Trocar tomada da sala com defeito");
        req.setDate(date);
        req.setTime(LocalTime.of(10, 0));
        req.setClientFirstName("Pedro");
        req.setClientLastName("Silva");
        req.setClientEmail("pedro@example.com");
        req.setClientPhone("+55 31 99999-9999");
        req.setClientCep("35450000");
        req.setClientStreet("Rua Sao Jose");
        req.setClientNeighborhood("Centro");
        req.setClientNumber("123");
        req.setClientCity("Itabirito");
        req.setClientState("MG");
        return req;
    }

    private static Servico confirmedBooking(LocalDate date, LocalTime time) {
        return confirmedBooking(date, time, null);
    }

    private static Servico confirmedBooking(LocalDate date, LocalTime time, String assignedProviderId) {
        ZonedDateTime start = ZonedDateTime.of(date, time, ZONE);
        Servico servico = new Servico();
        servico.setTitle("Visita tecnica");
        servico.setDescription("Atendimento confirmado para ocupar agenda");
        servico.setServiceNotes("Atendimento confirmado para ocupar agenda");
        servico.setStart(start.toInstant());
        servico.setEnd(start.plusHours(1).toInstant());
        servico.setAppointmentStart(start.toInstant());
        servico.setAppointmentEnd(start.plusHours(1).toInstant());
        servico.setStatus("CONFIRMED");
        servico.setClientFirstName("Maria");
        servico.setClientLastName("Souza");
        servico.setClientEmail("maria@example.com");
        servico.setClientPhone("31988888888");
        servico.setClientCep("35450000");
        servico.setClientStreet("Rua Um");
        servico.setClientNeighborhood("Centro");
        servico.setClientNumber("10");
        servico.setClientCity("Itabirito");
        servico.setClientState("MG");
        servico.setAssignedProviderId(assignedProviderId);
        return servico;
    }

    private static AdminPrincipal principal(String id, AdminRole role) {
        return new AdminPrincipal(new AdminUser(id, "31999999999", id, role, true, 0, 0), null);
    }

    private static AdminAuthService adminAuthServiceWithoutAdmins() {
        return new AdminAuthService(
                new NoAdminUserStore(),
                new NoopAdminSessionStore(),
                new TrackingVerificationStore(),
                new NoopOtpDeliveryClient(),
                new AppProperties());
    }

    private static class NoAdminUserStore implements AdminUserStore {
        @Override
        public AdminUser findActiveByPhone(String phoneDigits) {
            return null;
        }

        @Override
        public AdminUser findActiveById(String id) {
            return null;
        }

        @Override
        public List<AdminUser> listActive() {
            return List.of();
        }

        @Override
        public void updateLastLogin(String id, long epochSec) {
        }
    }

    private static class NoopAdminSessionStore implements AdminSessionStore {
        @Override
        public void save(AdminSession session) {
        }

        @Override
        public AdminSession findActiveByTokenHash(String tokenHash, long nowEpochSec) {
            return null;
        }

        @Override
        public void touch(String sessionId, long nowEpochSec) {
        }

        @Override
        public void revokeByTokenHash(String tokenHash, long nowEpochSec) {
        }

        @Override
        public int deleteExpired(long nowEpochSec) {
            return 0;
        }
    }

    private static class NoopOtpDeliveryClient implements OtpDeliveryClient {
        @Override
        public void sendCode(String phoneDigits, String code) {
        }
    }

    private static class FailingOtpDeliveryClient implements OtpDeliveryClient {
        @Override
        public void sendCode(String phoneDigits, String code) {
            throw ExternalServiceException.upstreamFailure("SMS", 502, null);
        }
    }

    private static class TrackingVerificationStore implements VerificationStore {
        private Session session;

        @Override
        public Session create(String scopeId, String phoneDigits, long otpTtlSeconds, long resendAfterSeconds) {
            session = new Session(
                    "vfy_create",
                    scopeId,
                    phoneDigits,
                    "123",
                    Instant.now().plusSeconds(otpTtlSeconds).getEpochSecond(),
                    Instant.now().plusSeconds(resendAfterSeconds).getEpochSecond());
            return session;
        }

        @Override
        public Session get(String verificationId) {
            return session != null && session.verificationId.equals(verificationId) ? session : null;
        }

        @Override
        public void delete(String verificationId) {
            if (session != null && session.verificationId.equals(verificationId)) {
                session = null;
            }
        }

        @Override
        public Session refreshResend(String verificationId, long resendAfterSeconds) {
            if (session == null || !session.verificationId.equals(verificationId)) {
                return null;
            }
            session = session.withResendAllowedAt(Instant.now().plusSeconds(resendAfterSeconds).getEpochSecond());
            return session;
        }
    }
}
