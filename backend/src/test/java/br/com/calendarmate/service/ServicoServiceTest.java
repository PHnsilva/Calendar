package br.com.calendarmate.service;

import br.com.calendarmate.booking.application.GetAvailableSlotsUseCase;
import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.controller.ServicoController;
import br.com.calendarmate.dto.AdminServicoUpdateRequest;
import br.com.calendarmate.dto.AvailabilityBlockCreateRequest;
import br.com.calendarmate.dto.AvailableSlotResponse;
import br.com.calendarmate.dto.ServicoCreateResponse;
import br.com.calendarmate.dto.ServicoRequest;
import br.com.calendarmate.dto.ServicoResponse;
import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.exception.ExternalServiceException;
import br.com.calendarmate.exception.ForbiddenException;
import br.com.calendarmate.exception.GlobalExceptionHandler;
import br.com.calendarmate.exception.NotFoundException;
import br.com.calendarmate.exception.ReservedAdminPhoneException;
import br.com.calendarmate.google.DummyCalendarClient;
import br.com.calendarmate.integrations.OtpDeliveryClient;
import br.com.calendarmate.model.AdminPrincipal;
import br.com.calendarmate.model.AdminRole;
import br.com.calendarmate.model.AdminSession;
import br.com.calendarmate.model.AdminUser;
import br.com.calendarmate.model.Servico;
import br.com.calendarmate.service.store.AdminSessionStore;
import br.com.calendarmate.service.store.AdminUserStore;
import br.com.calendarmate.service.store.InMemoryAdminUserStore;
import br.com.calendarmate.service.store.InMemoryAdminSessionStore;
import br.com.calendarmate.service.store.InMemoryBookingHistoryStore;
import br.com.calendarmate.service.store.InMemoryPendingStore;
import br.com.calendarmate.service.store.VerificationStore;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.Event;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.io.IOException;
import java.time.Duration;
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
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ServicoServiceTest {
    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    @Test
    void createPersistsNoSmsConfirmedBookingWithoutVerificationSession() throws IOException {
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

        ServicoCreateResponse created = service.create(validRequest(nextAvailableDate(calendar, props)));

        assertEquals("CONFIRMED", created.getServico().getStatus());
        assertEquals("", created.getVerificationId());
        assertEquals(0, created.getExpiresInSeconds());
        assertEquals(0, created.getResendAfterSeconds());
        assertNull(created.getPendingExpiresAt());
        assertTrue(pendingStore.listByPhone("31999999999").isEmpty());
        assertNull(verificationStore.get("vfy_create"));
        assertEquals(1, calendar.listEventsByPhone(
                new DateTime(Date.from(LocalDate.now(ZONE).minusDays(1).atStartOfDay(ZONE).toInstant())),
                new DateTime(Date.from(LocalDate.now(ZONE).plusMonths(2).atStartOfDay(ZONE).toInstant())),
                "31999999999").size());
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
    void publicNoSmsBookingCannotBeCreatedForToday() {
        AppProperties props = new AppProperties();
        ServicoService service = serviceWith(new DummyCalendarClient(), props);
        ServicoRequest request = validRequest(LocalDate.now(ZONE));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.create(request));

        assertTrue(ex.getMessage().contains("24 horas"));
    }

    @Test
    void publicNoSmsBookingRequiresMinimumLeadTime() {
        AppProperties props = new StrictLeadProperties();
        ServicoService service = serviceWith(new DummyCalendarClient(), props);
        ServicoRequest request = validRequest(LocalDate.now(ZONE).plusDays(1));
        request.setTime(LocalTime.now(ZONE).withMinute(0).withSecond(0).withNano(0));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.create(request));

        assertTrue(ex.getMessage().contains("24 horas"));
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
    void listMyReturnsPastAppointmentsWithAnExpiredSignedManageToken() throws IOException {
        AppProperties props = new AppProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        ServicoService service = serviceWith(calendar, props);
        Event past = calendar.createEvent(confirmedBooking(LocalDate.now(ZONE).minusDays(10), LocalTime.of(9, 0)));
        calendar.createEvent(confirmedBooking(LocalDate.now(ZONE).plusDays(2), LocalTime.of(9, 0)));
        TokenUtil tokenUtil = new TokenUtil("test-secret", -1);
        String expiredToken = tokenUtil.generate(past.getId(), "maria@example.com");

        List<ServicoResponse> bookings = service.listMy(expiredToken);

        assertNull(tokenUtil.verify(expiredToken));
        assertEquals(1, bookings.size());
        assertEquals(past.getId(), bookings.get(0).getEventId());
        assertTrue(bookings.get(0).getStart().isBefore(Instant.now()));
    }

    @Test
    void listMyReturnsEmptyWhenTheSignedBookingIsOutsideHistoryRetention() throws IOException {
        AppProperties props = new AppProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        ServicoService service = serviceWith(calendar, props);
        Event old = calendar.createEvent(confirmedBooking(LocalDate.now(ZONE).minusMonths(4), LocalTime.of(9, 0)));
        String token = new TokenUtil("test-secret", 600).generate(old.getId(), "maria@example.com");

        List<ServicoResponse> bookings = service.listMy(token);

        assertTrue(bookings.isEmpty());
    }

    @Test
    void createUsesSelectedServiceWhenOptionalNotesAndCepAreOmitted() throws IOException {
        AppProperties props = new AppProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        ServicoService service = serviceWith(calendar, props);
        ServicoRequest request = validRequest(nextAvailableDate(calendar, props));
        request.setServiceType("Eletrica");
        request.setServiceNotes(null);
        request.setClientCep("");

        ServicoResponse created = service.create(request).getServico();

        assertEquals("Eletrica", created.getServiceType());
        assertEquals("", created.getServiceNotes());
        assertFalse(created.getClientAddressLine().contains("CEP"));

        AdminServicoUpdateRequest update = adminUpdateRequest(created, request.getDate());
        update.setServiceNotes(null);
        ServicoResponse updated = service.updateByIdAdmin(
                created.getEventId(),
                principal("owner-1", AdminRole.OWNER),
                update);
        assertEquals("", updated.getServiceNotes());
    }

    @Test
    void adminListReturnsTomorrowBookingWithOneCalendarRead() throws IOException {
        AppProperties props = new AppProperties();
        TrackingCalendarClient calendar = new TrackingCalendarClient();
        ServicoService service = serviceWith(calendar, props);
        LocalDate tomorrow = LocalDate.now(ZONE).plusDays(1);
        Event expected = calendar.createEvent(confirmedBooking(tomorrow, LocalTime.of(9, 0)));
        calendar.resetListBookingEventsCalls();

        List<ServicoResponse> visible = service.listAllAdmin(
                principal("owner-1", AdminRole.OWNER),
                tomorrow,
                tomorrow,
                null,
                null);

        assertEquals(1, calendar.getListBookingEventsCalls());
        assertEquals(1, visible.size());
        assertEquals(expected.getId(), visible.get(0).getEventId());
        assertEquals(tomorrow, visible.get(0).getStart().atZone(ZONE).toLocalDate());
        assertEquals("CONFIRMED", visible.get(0).getStatus());
    }

    @Test
    void adminListIsReadOnlyAndStillReturnsTomorrowWhenExpiredPendingCleanupWouldFail() throws IOException {
        AppProperties props = new AppProperties();
        DeleteFailingCalendarClient calendar = new DeleteFailingCalendarClient();
        ServicoService service = serviceWith(calendar, props);
        LocalDate tomorrow = LocalDate.now(ZONE).plusDays(1);
        Event expected = calendar.createEvent(confirmedBooking(tomorrow, LocalTime.of(9, 0)));
        Servico expiredPending = confirmedBooking(tomorrow, LocalTime.of(10, 0));
        expiredPending.setStatus("PENDING_PHONE");
        expiredPending.setPendingExpiresAt(Instant.now().minusSeconds(60));
        calendar.createEvent(expiredPending);
        calendar.resetListBookingEventsCalls();

        List<ServicoResponse> visible = service.listAllAdmin(
                principal("owner-1", AdminRole.OWNER),
                tomorrow,
                tomorrow,
                null,
                null);

        assertEquals(1, calendar.getListBookingEventsCalls());
        assertEquals(0, calendar.getDeleteEventCalls());
        assertEquals(1, visible.size());
        assertEquals(expected.getId(), visible.get(0).getEventId());
    }

    @Test
    void authenticatedAdminEndpointReturnsTomorrowBookingForRequestedRange() throws Exception {
        EndpointAdminProperties props = new EndpointAdminProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        AdminAuthService auth = new AdminAuthService(
                new InMemoryAdminUserStore("+55 31 99999-9999|Owner|OWNER|owner-1"),
                new InMemoryAdminSessionStore(),
                new TrackingVerificationStore(),
                new NoopOtpDeliveryClient(),
                props);
        String sessionToken = auth.passwordLogin("+55 31 99999-9999", "team-password").getSessionToken();
        ServicoService service = serviceWith(calendar, props, auth);
        LocalDate tomorrow = LocalDate.now(ZONE).plusDays(1);
        Event expected = calendar.createEvent(confirmedBooking(tomorrow, LocalTime.of(9, 0)));
        MockMvc mvc = MockMvcBuilders
                .standaloneSetup(new ServicoController(
                        service,
                        new TokenUtil("test-secret", 600),
                        auth,
                        mock(GetAvailableSlotsUseCase.class),
                        mock(PublicBookingRateLimiter.class),
                        mock(ClientIpResolver.class)))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        mvc.perform(get("/api/servicos/admin")
                        .header("X-ADMIN-SESSION", sessionToken)
                        .header("X-ADMIN-WORKSPACE", "ADMIN")
                        .param("from", tomorrow.toString())
                        .param("to", tomorrow.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].eventId").value(expected.getId()))
                .andExpect(jsonPath("$[0].status").value("CONFIRMED"));

        mvc.perform(get("/api/servicos/admin/{eventId}", expected.getId())
                        .header("X-ADMIN-SESSION", sessionToken)
                        .header("X-ADMIN-WORKSPACE", "ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eventId").value(expected.getId()))
                .andExpect(jsonPath("$.clientLastName").value("Souza"));

        mvc.perform(delete("/api/servicos/admin/{eventId}", expected.getId())
                        .header("X-ADMIN-SESSION", sessionToken)
                        .header("X-ADMIN-WORKSPACE", "ADMIN"))
                .andExpect(status().isOk());

        mvc.perform(get("/api/servicos/admin/{eventId}", expected.getId())
                        .header("X-ADMIN-SESSION", sessionToken)
                        .header("X-ADMIN-WORKSPACE", "ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void adminDefaultWindowUsesTodayThroughNextSevenDays() throws IOException {
        AppProperties props = new AppProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        ServicoService service = serviceWith(calendar, props);
        LocalDate today = LocalDate.now(ZONE);
        Event past = calendar.createEvent(confirmedBooking(today.minusDays(1), LocalTime.of(9, 0)));
        Event todayBooking = calendar.createEvent(confirmedBooking(today, LocalTime.of(10, 0)));
        Event seventhDay = calendar.createEvent(confirmedBooking(today.plusDays(7), LocalTime.of(11, 0)));
        Event eighthDay = calendar.createEvent(confirmedBooking(today.plusDays(8), LocalTime.of(12, 0)));
        AdminPrincipal owner = principal("owner-1", AdminRole.OWNER);

        List<ServicoResponse> visible = service.listAllAdmin(owner, null, null, null, null);

        assertFalse(visible.stream().anyMatch(item -> past.getId().equals(item.getEventId())));
        assertTrue(visible.stream().anyMatch(item -> todayBooking.getId().equals(item.getEventId())));
        assertTrue(visible.stream().anyMatch(item -> seventhDay.getId().equals(item.getEventId())));
        assertFalse(visible.stream().anyMatch(item -> eighthDay.getId().equals(item.getEventId())));
    }

    @Test
    void providerDoesNotSeeUnassignedBookingsWhileOwnerDoes() throws IOException {
        AppProperties props = new AppProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        ServicoService service = serviceWith(calendar, props);
        LocalDate date = LocalDate.now(ZONE).plusDays(2);
        Event assigned = calendar.createEvent(confirmedBooking(date, LocalTime.of(9, 0), "provider-1"));
        Event unassigned = calendar.createEvent(confirmedBooking(date, LocalTime.of(10, 0)));
        AdminPrincipal owner = principal("owner-1", AdminRole.OWNER);
        AdminPrincipal provider = principal("provider-1", AdminRole.PROVIDER);

        List<ServicoResponse> ownerVisible = service.listAllAdmin(owner, date, date, null, null);
        List<ServicoResponse> providerVisible = service.listAllAdmin(provider, date, date, null, null);

        assertTrue(ownerVisible.stream().anyMatch(item -> assigned.getId().equals(item.getEventId())));
        assertTrue(ownerVisible.stream().anyMatch(item -> unassigned.getId().equals(item.getEventId())));
        assertEquals(1, providerVisible.size());
        assertEquals(assigned.getId(), providerVisible.get(0).getEventId());
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

    @Test
    void rejectsReservedAdminOrProviderPhoneWithoutTemporaryPassword() throws IOException {
        AppProperties props = new AppProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        AdminAuthService adminAuthService = adminAuthServiceWithUsers("+55 31 98888-8888|Provider|PROVIDER|provider-1");
        ServicoService service = serviceWith(calendar, props, adminAuthService);
        ServicoRequest request = validRequest(nextAvailableDate(calendar, props));
        request.setClientPhone("+55 31 98888-8888");

        assertThrows(ReservedAdminPhoneException.class, () -> service.create(request));

        request.setReservedPhonePassword("wrong-password");
        assertThrows(ReservedAdminPhoneException.class, () -> service.create(request));

        request.setReservedPhonePassword(props.getAdminTempPassword());
        ServicoCreateResponse created = service.create(request);

        assertEquals("CONFIRMED", created.getServico().getStatus());
        assertEquals("31988888888", created.getServico().getClientPhone());
    }

    @Test
    void updateByTokenRejectsReservedAdminOrProviderPhoneWithoutTemporaryPassword() throws IOException {
        AppProperties props = new AppProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        AdminAuthService adminAuthService = adminAuthServiceWithUsers("+55 31 97777-7777|Provider|PROVIDER|provider-2");
        ServicoService service = serviceWith(calendar, props, adminAuthService);
        LocalDate date = nextAvailableDate(calendar, props);
        ServicoCreateResponse created = service.create(validRequest(date));
        ServicoRequest update = validRequest(date);
        update.setClientPhone("+55 31 97777-7777");

        assertThrows(ReservedAdminPhoneException.class, () -> service.updateByToken(
                created.getServico().getEventId(),
                created.getManageToken(),
                update));

        update.setReservedPhonePassword(props.getAdminTempPassword());
        ServicoResponse updated = service.updateByToken(
                created.getServico().getEventId(),
                created.getManageToken(),
                update);

        assertEquals("31977777777", updated.getClientPhone());
    }

    @Test
    void noSmsPublicBookingIsVisibleToAdminQueriesWithConfirmedStatus() throws IOException {
        AppProperties props = new AppProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        ServicoService service = serviceWith(calendar, props);
        LocalDate date = nextAvailableDateWithinAdminWindow(calendar, props);
        ServicoCreateResponse created = service.create(validRequest(date));
        AdminPrincipal owner = principal("owner-1", AdminRole.OWNER);

        List<ServicoResponse> visible = service.listAllAdmin(owner, null, null, null, null);
        List<ServicoResponse> confirmed = service.listAllAdmin(owner, date, date, "CONFIRMED", null);

        assertTrue(visible.stream().anyMatch(booking -> created.getServico().getEventId().equals(booking.getEventId())));
        ServicoResponse booking = confirmed.stream()
                .filter(item -> created.getServico().getEventId().equals(item.getEventId()))
                .findFirst()
                .orElseThrow();
        assertEquals("CONFIRMED", booking.getStatus());
        assertEquals("Pedro", booking.getClientFirstName());
        assertEquals("31999999999", booking.getClientPhone());
        assertEquals("Visita tecnica", booking.getServiceType());
    }

    @Test
    void adminUpdateDtoPreservesExistingSurnameWithoutAcceptingItInPayload() throws IOException {
        AppProperties props = new AppProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        ServicoService service = serviceWith(calendar, props);
        LocalDate date = nextAvailableDate(calendar, props);
        ServicoResponse created = service.create(validRequest(date)).getServico();
        AdminServicoUpdateRequest update = adminUpdateRequest(created, date);
        update.setClientFirstName("Paulo");

        ServicoResponse updated = service.updateByIdAdmin(
                created.getEventId(),
                principal("owner-1", AdminRole.OWNER),
                update);

        assertEquals("Paulo", updated.getClientFirstName());
        assertEquals("Silva", updated.getClientLastName());
        assertThrows(NotFoundException.class, () -> service.getByIdAdmin("missing-event", principal("owner-1", AdminRole.OWNER)));
    }

    private static ServicoService serviceWith(DummyCalendarClient calendar, AppProperties props) {
        return serviceWith(calendar, props, adminAuthServiceWithoutAdmins());
    }

    private static ServicoService serviceWith(DummyCalendarClient calendar, AppProperties props, AdminAuthService adminAuthService) {
        TokenUtil tokenUtil = new TokenUtil("test-secret", 600);
        InMemoryPendingStore pendingStore = new InMemoryPendingStore();
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
        for (int offset = 2; offset <= 45; offset++) {
            LocalDate candidate = today.plusDays(offset);
            YearMonth candidateMonth = YearMonth.from(candidate);
            if ((candidateMonth.equals(current) || candidateMonth.equals(next)) && policy.hasAnyAvailability(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("No available test date in booking window");
    }

    private static LocalDate nextAvailableDateWithinAdminWindow(DummyCalendarClient calendar, AppProperties props) throws IOException {
        AvailabilityPolicyService policy = new AvailabilityPolicyService(calendar, props);
        LocalDate today = LocalDate.now(ZONE);
        for (int offset = 2; offset <= 7; offset++) {
            LocalDate candidate = today.plusDays(offset);
            if (policy.hasAnyAvailability(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("No available test date inside default admin window");
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

    private static AdminServicoUpdateRequest adminUpdateRequest(ServicoResponse source, LocalDate date) {
        AdminServicoUpdateRequest req = new AdminServicoUpdateRequest();
        req.setServiceType(source.getServiceType());
        req.setServiceNotes(source.getServiceNotes());
        req.setDate(date);
        req.setTime(source.getStart().atZone(ZONE).toLocalTime());
        req.setClientFirstName(source.getClientFirstName());
        req.setClientEmail(source.getClientEmail());
        req.setClientPhone(source.getClientPhone());
        req.setClientCep(source.getClientCep());
        req.setClientStreet(source.getClientStreet());
        req.setClientNeighborhood(source.getClientNeighborhood());
        req.setClientNumber(source.getClientNumber());
        req.setClientComplement(source.getClientComplement());
        req.setClientCity(source.getClientCity());
        req.setClientState(source.getClientState());
        req.setClientLatitude(source.getClientLatitude());
        req.setClientLongitude(source.getClientLongitude());
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

    private static AdminAuthService adminAuthServiceWithUsers(String usersCsv) {
        return new AdminAuthService(
                new InMemoryAdminUserStore(usersCsv),
                new NoopAdminSessionStore(),
                new TrackingVerificationStore(),
                new NoopOtpDeliveryClient(),
                new AppProperties());
    }

    private static class StrictLeadProperties extends AppProperties {
        @Override
        public Duration getBookingMinLeadTime() {
            return Duration.ofHours(24).plusSeconds(1);
        }
    }

    private static class EndpointAdminProperties extends AppProperties {
        @Override
        public String getAdminTempPassword() {
            return "team-password";
        }
    }

    private static class TrackingCalendarClient extends DummyCalendarClient {
        private int listBookingEventsCalls;

        @Override
        public List<Event> listBookingEvents(DateTime timeMin, DateTime timeMax) throws IOException {
            listBookingEventsCalls++;
            return super.listBookingEvents(timeMin, timeMax);
        }

        int getListBookingEventsCalls() {
            return listBookingEventsCalls;
        }

        void resetListBookingEventsCalls() {
            listBookingEventsCalls = 0;
        }
    }

    private static class DeleteFailingCalendarClient extends TrackingCalendarClient {
        private int deleteEventCalls;

        @Override
        public void deleteEvent(String eventId) throws IOException {
            deleteEventCalls++;
            throw new IOException("Calendar delete unavailable");
        }

        int getDeleteEventCalls() {
            return deleteEventCalls;
        }
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
