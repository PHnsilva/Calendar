package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.AvailableSlotResponse;
import br.com.calendarmate.dto.ServicoCreateResponse;
import br.com.calendarmate.dto.ServicoRequest;
import br.com.calendarmate.dto.ServicoResponse;
import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.exception.ConflictException;
import br.com.calendarmate.exception.ForbiddenException;
import br.com.calendarmate.exception.NotFoundException;
import br.com.calendarmate.google.CalendarClient;
import br.com.calendarmate.model.PendingRecord;
import br.com.calendarmate.model.Servico;
import br.com.calendarmate.model.TimeWindow;
import br.com.calendarmate.model.AdminPrincipal;
import br.com.calendarmate.model.AdminUser;
import br.com.calendarmate.service.store.BookingHistoryStore;
import br.com.calendarmate.service.store.PendingStore;
import br.com.calendarmate.util.LocationNormalizer;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.api.services.calendar.model.TimePeriod;

import java.io.IOException;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

public class ServicoService {

    private final CalendarClient calendar;
    private final TokenUtil tokenUtil;
    private final VerificationService verificationService;
    private final AppProperties props;
    private final AvailabilityPolicyService availabilityPolicyService;
    private final PendingStore pendingStore;
    private final AdminAuthService adminAuthService;
    private final BookingHistoryStore bookingHistoryStore;

    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");
    private static final Set<Integer> ALLOWED_MINUTES = Set.of(0);

    private record BookingWindow(
            Instant blockStart,
            Instant blockEnd,
            Instant appointmentStart,
            Instant appointmentEnd,
            int blockMinutes) {
    }

    public ServicoService(
            CalendarClient calendar,
            TokenUtil tokenUtil,
            VerificationService verificationService,
            PendingStore pendingStore,
            AppProperties props,
            AvailabilityPolicyService availabilityPolicyService,
            AdminAuthService adminAuthService,
            BookingHistoryStore bookingHistoryStore) {
        this.calendar = calendar;
        this.tokenUtil = tokenUtil;
        this.verificationService = verificationService;
        this.pendingStore = pendingStore;
        this.props = props;
        this.availabilityPolicyService = availabilityPolicyService;
        this.adminAuthService = adminAuthService;
        this.bookingHistoryStore = bookingHistoryStore;
    }

    public ServicoCreateResponse create(ServicoRequest req) throws IOException {
        validateDateWindow(req.getDate());
        validateTime(req.getTime());
        validateServiceArea(req);

        String phoneDigits = normalizePhone(req.getClientPhone());
        if (adminAuthService.isAdminPhone(phoneDigits)) {
            throw new ForbiddenException("Telefone reservado para acesso administrativo");
        }

        cleanupExpiredPendings();
        if (props.isBlockOtherBookingsWhenPending() && hasActivePendingForPhone(phoneDigits)) {
            throw new ConflictException("Você já tem um agendamento pendente de confirmação");
        }

        BookingWindow window = resolveBookingWindow(req.getDate(), req.getTime(), req.getClientCity());
        Instant start = window.blockStart();
        Instant end = window.blockEnd();

        if (!end.isAfter(start)) {
            throw new BadRequestException("Horário inválido");
        }

        validateRequestedWindowAvailable(start, end);

        DateTime timeMin = new DateTime(Date.from(start));
        DateTime timeMax = new DateTime(Date.from(end));
        List<TimePeriod> busy = calendar.freeBusy(timeMin, timeMax);
        if (busy != null && !busy.isEmpty()) {
            throw new ConflictException("Horário indisponível");
        }

        Instant pendingExpiresAt = Instant.now().plus(props.getPendingTtl());

        Servico s = new Servico();
        s.setId(UUID.randomUUID().toString());

        s.setTitle(req.getServiceType());
        s.setDescription(req.getServiceType());

        s.setStart(start);
        s.setEnd(end);
        s.setAppointmentStart(window.appointmentStart());
        s.setAppointmentEnd(window.appointmentEnd());

        s.setClientFirstName(req.getClientFirstName());
        s.setClientLastName(req.getClientLastName());
        s.setClientEmail(req.getClientEmail());
        s.setClientPhone(phoneDigits);

        s.setClientCep(req.getClientCep());
        s.setClientStreet(req.getClientStreet());
        s.setClientNeighborhood(req.getClientNeighborhood());
        s.setClientNumber(req.getClientNumber());
        s.setClientComplement(req.getClientComplement());
        s.setClientCity(req.getClientCity());
        s.setClientState(req.getClientState());

        s.setStatus("PENDING_PHONE");
        s.setPendingExpiresAt(pendingExpiresAt);

        Event created = calendar.createEvent(s);

        String token = tokenUtil.generate(created.getId(), req.getClientEmail());

        VerificationService.StartResult otp = verificationService.start(
                token,
                phoneDigits);

        ServicoResponse servico = mapEventToResponse(created);
        servico.setStatus("PENDING_PHONE");

        ServicoCreateResponse out = new ServicoCreateResponse();
        out.setServico(servico);
        out.setManageToken(token);
        out.setVerificationId(otp.verificationId());
        out.setExpiresInSeconds(otp.expiresInSeconds());
        out.setResendAfterSeconds(otp.resendAfterSeconds());
        out.setPendingExpiresAt(pendingExpiresAt);

        return out;
    }

    public ServicoResponse getByToken(String token) throws IOException {
        TokenUtil.VerifiedToken vt = tokenUtil.verify(token);
        if (vt == null) {
            throw new ForbiddenException("Token inválido ou expirado");
        }

        Event e = calendar.getEvent(vt.getEventId());
        if (e == null || "cancelled".equalsIgnoreCase(e.getStatus())) {
            throw new NotFoundException("Agendamento não encontrado");
        }

        Map<String, String> ext = privateExt(e);
        String email = ext.getOrDefault("clientEmail", "");
        if (email.isBlank() || !vt.getClientEmail().equalsIgnoreCase(email)) {
            throw new ForbiddenException("Token inválido");
        }

        if (isExpiredPending(ext)) {
            pendingStore.deleteByEventId(e.getId());
            calendar.deleteEvent(e.getId());
            throw new NotFoundException("Agendamento não encontrado");
        }

        return mapEventToResponse(e);
    }

    public List<ServicoResponse> listMy(String token) throws IOException {
        TokenUtil.VerifiedToken vt = tokenUtil.verify(token);
        if (vt == null) {
            throw new ForbiddenException("Token inválido ou expirado");
        }

        cleanupExpiredPendings();

        Event seed = calendar.getEvent(vt.getEventId());
        if (seed == null) {
            throw new NotFoundException("Agendamento não encontrado");
        }

        Map<String, String> ext = privateExt(seed);
        if (isExpiredPending(ext)) {
            pendingStore.deleteByEventId(seed.getId());
            calendar.deleteEvent(seed.getId());
            throw new NotFoundException("Agendamento não encontrado");
        }

        String phone = ext.getOrDefault("clientPhone", "");
        phone = normalizePhone(phone);

        return listByPhone(phone);
    }

    public List<ServicoResponse> listByPhone(String phoneDigits) throws IOException {
        String phone = normalizePhone(phoneDigits);

        cleanupExpiredPendings();

        return listEventsByPhone(phone).stream()
                .map(this::mapEventToResponse)
                .collect(Collectors.toList());
    }

    public List<ServicoResponse> confirmPendingByPhone(String phoneDigits) throws IOException {
        String phone = normalizePhone(phoneDigits);

        cleanupExpiredPendings();

        List<Event> events = listEventsByPhone(phone);
        List<ServicoResponse> out = new ArrayList<>();

        for (Event event : events) {
            Event current = event;
            Map<String, String> ext = privateExt(current);

            if ("PENDING_PHONE".equalsIgnoreCase(ext.getOrDefault("status", "")) && !isExpiredPending(ext)) {
                Servico s = servicoFromEvent(current);
                s.setClientPhone(phone);
                s.setStatus("CONFIRMED");
                s.setPhoneVerifiedAt(Instant.now());
                s.setPendingExpiresAt(null);

                Event updated = calendar.updateEvent(s);
                if (updated != null) {
                    current = updated;
                }
                pendingStore.deleteByEventId(current.getId());
            }

            out.add(mapEventToResponse(current));
        }

        return out;
    }

    private List<Event> listEventsByPhone(String phone) throws IOException {
        ZonedDateTime base = firstDayOfMonth(ZonedDateTime.now(ZONE));
        ZonedDateTime from = base.minusMonths(props.getHistoryRetentionMonths());
        ZonedDateTime to = base.plusMonths(2);

        List<Event> events = calendar.listEventsByPhone(
                new DateTime(Date.from(from.toInstant())),
                new DateTime(Date.from(to.toInstant())),
                phone);
        if (events == null) {
            return Collections.emptyList();
        }

        return events;
    }

    public ServicoResponse updateByToken(String eventId, String token, ServicoRequest req) throws IOException {
        validateDateWindow(req.getDate());
        validateTime(req.getTime());
        validateServiceArea(req);

        TokenUtil.VerifiedToken vt = tokenUtil.verify(token);
        if (vt == null || !vt.getEventId().equals(eventId)) {
            throw new ForbiddenException("Token inválido");
        }

        Event existing = calendar.getEvent(eventId);
        if (existing == null) {
            throw new NotFoundException("Agendamento não encontrado");
        }

        Map<String, String> ext0 = privateExt(existing);
        if (isExpiredPending(ext0)) {
            pendingStore.deleteByEventId(existing.getId());
            calendar.deleteEvent(existing.getId());
            throw new NotFoundException("Agendamento não encontrado");
        }

        String existingEmail = ext0.getOrDefault("clientEmail", "");
        if (!vt.getClientEmail().equalsIgnoreCase(existingEmail)) {
            throw new ForbiddenException("Token inválido");
        }

        validateManageWindow(existing);
        validateCityImmutable(req, ext0);

        BookingWindow window = resolveBookingWindow(req.getDate(), req.getTime(), req.getClientCity());
        Instant start = window.blockStart();
        Instant end = window.blockEnd();

        if (!end.isAfter(start)) {
            throw new BadRequestException("Horário inválido");
        }

        validateRequestedWindowAvailable(start, end);

        DateTime timeMin = new DateTime(Date.from(start));
        DateTime timeMax = new DateTime(Date.from(end));
        List<TimePeriod> busy = calendar.freeBusy(timeMin, timeMax);
        if (busy == null) {
            busy = Collections.emptyList();
        }

        Instant oldStart = instantFrom(existing.getStart());
        Instant oldEnd = instantFrom(existing.getEnd());

        boolean conflict = busy.stream().anyMatch(tp -> {
            if (tp.getStart() == null || tp.getEnd() == null)
                return true;
            Instant bs = Instant.ofEpochMilli(tp.getStart().getValue());
            Instant be = Instant.ofEpochMilli(tp.getEnd().getValue());
            boolean isSelf = oldStart != null && oldEnd != null
                    && !bs.isBefore(oldStart)
                    && !be.isAfter(oldEnd);
            return !isSelf;
        });

        if (conflict) {
            throw new ConflictException("Horário indisponível");
        }

        String phoneDigits = normalizePhone(req.getClientPhone());

        Servico s = new Servico();
        s.setEventId(eventId);
        s.setTitle(req.getServiceType());
        s.setDescription(req.getServiceType());
        s.setStart(start);
        s.setEnd(end);
        s.setAppointmentStart(window.appointmentStart());
        s.setAppointmentEnd(window.appointmentEnd());

        s.setClientFirstName(req.getClientFirstName());
        s.setClientLastName(req.getClientLastName());
        s.setClientEmail(req.getClientEmail());
        s.setClientPhone(phoneDigits);

        s.setClientCep(req.getClientCep());
        s.setClientStreet(req.getClientStreet());
        s.setClientNeighborhood(req.getClientNeighborhood());
        s.setClientNumber(req.getClientNumber());
        s.setClientComplement(req.getClientComplement());
        s.setClientCity(req.getClientCity());
        s.setClientState(req.getClientState());

        String curStatus = ext0.getOrDefault("status", "PENDING_PHONE");
        s.setStatus(curStatus);

        String pe = ext0.get("pendingExpiresAt");
        if (pe != null && pe.matches("\\d+")) {
            s.setPendingExpiresAt(Instant.ofEpochSecond(Long.parseLong(pe)));
        }

        String pv = ext0.get("phoneVerifiedAt");
        if (pv != null && pv.matches("\\d+")) {
            s.setPhoneVerifiedAt(Instant.ofEpochSecond(Long.parseLong(pv)));
        }

        Event updated = calendar.updateEvent(s);

        if ("PENDING_PHONE".equalsIgnoreCase(curStatus) && s.getPendingExpiresAt() != null) {
            pendingStore.upsert(new PendingRecord(
                    eventId,
                    phoneDigits,
                    s.getPendingExpiresAt().getEpochSecond(),
                    Instant.now().getEpochSecond()));
        } else {
            pendingStore.deleteByEventId(eventId);
        }

        return mapEventToResponse(updated);
    }

    public void cancelByToken(String eventId, String token) throws IOException {
        TokenUtil.VerifiedToken vt = tokenUtil.verify(token);
        if (vt == null || !vt.getEventId().equals(eventId)) {
            throw new ForbiddenException("Token inválido");
        }

        Event e = calendar.getEvent(eventId);
        if (e == null) {
            throw new NotFoundException("Agendamento não encontrado");
        }

        Map<String, String> ext = privateExt(e);
        String email = ext.getOrDefault("clientEmail", "");
        if (!vt.getClientEmail().equalsIgnoreCase(email)) {
            throw new ForbiddenException("Token inválido");
        }

        validateManageWindow(e);

        pendingStore.deleteByEventId(eventId);
        calendar.deleteEvent(eventId);
    }

    public List<ServicoResponse> listAllAdmin() throws IOException {
        return listAllAdmin(null, null, null, null, null);
    }

    public List<ServicoResponse> listAllAdmin(LocalDate fromDate, LocalDate toDate) throws IOException {
        return listAllAdmin(null, fromDate, toDate, null, null);
    }

    public List<ServicoResponse> listAllAdmin(LocalDate fromDate, LocalDate toDate, String status, String city)
            throws IOException {
        return listAllAdmin(null, fromDate, toDate, status, city);
    }

    public List<ServicoResponse> listAllAdmin(AdminPrincipal principal, LocalDate fromDate, LocalDate toDate, String status, String city)
            throws IOException {
        syncBookingHistory();

        ZonedDateTime base = firstDayOfMonth(ZonedDateTime.now(ZONE));
        LocalDate activeFrom = LocalDate.now(ZONE).minusDays(props.getAdminBookingActivePastDays());

        LocalDate resolvedFrom;
        LocalDate resolvedTo;

        if (fromDate == null && toDate == null) {
            resolvedFrom = activeFrom;
            resolvedTo = base.plusMonths(2).toLocalDate().minusDays(1);
        } else {
            resolvedFrom = (fromDate != null) ? fromDate : toDate;
            resolvedTo = (toDate != null) ? toDate : fromDate;

            if (resolvedFrom == null || resolvedTo == null) {
                throw new BadRequestException("Parâmetros inválidos");
            }
            if (resolvedFrom.isAfter(resolvedTo)) {
                throw new BadRequestException("Parâmetros inválidos: from deve ser <= to");
            }
        }

        cleanupExpiredPendings(resolvedFrom, resolvedTo);

        ZonedDateTime from = resolvedFrom.atStartOfDay(ZONE);
        ZonedDateTime to = resolvedTo.plusDays(1).atStartOfDay(ZONE);

        List<Event> events = listBookingEventsBetween(from, to);

        String normalizedStatus = normalizeAdminStatus(status);
        String normalizedCity = normalizeAdminCity(city);

        return events.stream()
                .filter(this::isActiveAdminBooking)
                .filter(e -> canPrincipalAccessEvent(principal, e))
                .filter(e -> matchesAdminStatus(e, normalizedStatus))
                .filter(e -> matchesAdminCity(e, normalizedCity))
                .map(this::mapEventToResponse)
                .collect(Collectors.toList());
    }

    public List<ServicoResponse> listHistoryAdmin(AdminPrincipal principal, LocalDate fromDate, LocalDate toDate, String status, String city)
            throws IOException {
        syncBookingHistory();

        Instant retentionStart = historyRetentionStartInstant();
        Instant historyEnd = historyCutoffInstant();

        Instant from = fromDate == null ? retentionStart : fromDate.atStartOfDay(ZONE).toInstant();
        Instant to = toDate == null ? historyEnd : toDate.plusDays(1).atStartOfDay(ZONE).toInstant();
        if (from.isBefore(retentionStart)) {
            from = retentionStart;
        }
        if (to.isAfter(historyEnd)) {
            to = historyEnd;
        }
        if (!from.isBefore(to)) {
            return List.of();
        }

        String assignedProviderId = principal != null && principal.isProvider() ? principal.getId() : null;
        String normalizedStatus = normalizeAdminStatus(status);
        String normalizedCity = normalizeAdminCity(city);

        return bookingHistoryStore.list(from, to, assignedProviderId).stream()
                .filter(item -> normalizedStatus.isBlank() || normalizedStatus.equalsIgnoreCase(item.getStatus()))
                .filter(item -> normalizedCity.isBlank() || normalizedCity.equals(LocationNormalizer.normalizeCity(item.getClientCity())))
                .collect(Collectors.toList());
    }

    private List<Event> listBookingEventsBetween(ZonedDateTime from, ZonedDateTime to) throws IOException {
        List<Event> events = calendar.listBookingEvents(
                new DateTime(Date.from(from.toInstant())),
                new DateTime(Date.from(to.toInstant())));
        return events == null ? Collections.emptyList() : events;
    }

    private boolean isActiveAdminBooking(Event event) {
        Instant start = instantFrom(event.getStart());
        return start != null && !start.isBefore(historyCutoffInstant());
    }

    private boolean canPrincipalAccessEvent(AdminPrincipal principal, Event event) {
        if (principal == null || principal.isOwner()) {
            return true;
        }
        Map<String, String> ext = privateExt(event);
        return principal.getId().equals(ext.getOrDefault("assignedProviderId", ""));
    }

    private void syncBookingHistory() throws IOException {
        Instant retentionStart = historyRetentionStartInstant();
        Instant historyEnd = historyCutoffInstant();
        if (!retentionStart.isBefore(historyEnd)) {
            return;
        }

        ZonedDateTime from = ZonedDateTime.ofInstant(retentionStart, ZONE);
        ZonedDateTime to = ZonedDateTime.ofInstant(historyEnd, ZONE);
        List<Event> events = listBookingEventsBetween(from, to);
        long archivedAt = Instant.now().getEpochSecond();

        for (Event event : events) {
            Map<String, String> ext = privateExt(event);
            if (isExpiredPending(ext)) {
                continue;
            }
            bookingHistoryStore.upsert(mapEventToResponse(event), archivedAt);
        }
        bookingHistoryStore.deleteOlderThan(retentionStart);
    }

    private Instant historyCutoffInstant() {
        return Instant.now().minus(Duration.ofDays(props.getAdminBookingActivePastDays()));
    }

    private Instant historyRetentionStartInstant() {
        return Instant.now().minus(Duration.ofDays(props.getHistoryRetentionDays()));
    }

    private boolean matchesAdminStatus(Event e, String normalizedStatus) {
        if (normalizedStatus.isBlank())
            return true;
        Map<String, String> ext = privateExt(e);
        String current = ext.getOrDefault("status", "PENDING_PHONE");
        return normalizedStatus.equalsIgnoreCase(current);
    }

    private boolean matchesAdminCity(Event e, String normalizedCity) {
        if (normalizedCity.isBlank())
            return true;
        Map<String, String> ext = privateExt(e);
        String current = LocationNormalizer.normalizeCity(ext.getOrDefault("clientCity", ""));
        return normalizedCity.equals(current);
    }

    private String normalizeAdminStatus(String status) {
        if (status == null)
            return "";
        return status.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeAdminCity(String city) {
        if (city == null || city.isBlank())
            return "";
        return LocationNormalizer.normalizeCity(city);
    }

    public void deleteByIdAdmin(String eventId) throws IOException {
        Event e = calendar.getEvent(eventId);
        if (e == null) {
            throw new NotFoundException("Agendamento não encontrado");
        }

        pendingStore.deleteByEventId(eventId);
        calendar.deleteEvent(eventId);
    }

    public ServicoResponse assignProviderAdmin(String eventId, AdminUser provider) throws IOException {
        Event existing = calendar.getEvent(eventId);
        if (existing == null) {
            throw new NotFoundException("Agendamento nao encontrado");
        }
        if (!isActiveAdminBooking(existing)) {
            throw new BadRequestException("Agendamento ja esta no historico");
        }

        Servico s = servicoFromEvent(existing);
        s.setAssignedProviderId(provider.getId());
        s.setAssignedProviderName(provider.getName());
        s.setAssignedProviderPhone(provider.getPhoneDigits());
        Event updated = calendar.updateEvent(s);
        return mapEventToResponse(updated == null ? existing : updated);
    }

    public void requireActiveAdminAccess(String eventId, AdminPrincipal principal) throws IOException {
        Event existing = calendar.getEvent(eventId);
        if (existing == null) {
            throw new NotFoundException("Agendamento nao encontrado");
        }
        if (!canPrincipalAccessEvent(principal, existing)) {
            throw new ForbiddenException("Agendamento nao designado para este prestador");
        }
        if (!isActiveAdminBooking(existing)) {
            throw new BadRequestException("Agendamento ja esta no historico");
        }
    }

    public ServicoResponse updateByIdAdmin(String eventId, AdminPrincipal principal, ServicoRequest req) throws IOException {
        Event existing = calendar.getEvent(eventId);
        if (existing == null) {
            throw new NotFoundException("Agendamento nao encontrado");
        }
        if (!canPrincipalAccessEvent(principal, existing)) {
            throw new ForbiddenException("Agendamento nao designado para este prestador");
        }
        if (!isActiveAdminBooking(existing)) {
            throw new BadRequestException("Agendamento ja esta no historico");
        }

        validateAdminDateWindow(req.getDate());
        validateTime(req.getTime());
        validateServiceArea(req);

        BookingWindow window = resolveBookingWindow(req.getDate(), req.getTime(), req.getClientCity());
        Instant start = window.blockStart();
        Instant end = window.blockEnd();
        if (!end.isAfter(start)) {
            throw new BadRequestException("Horario invalido");
        }

        validateRequestedWindowAvailable(start, end);
        validateAdminBusyWindow(existing, start, end);

        String phoneDigits = normalizePhone(req.getClientPhone());
        if (adminAuthService.isAdminPhone(phoneDigits)) {
            throw new ForbiddenException("Telefone reservado para acesso administrativo");
        }

        Map<String, String> ext0 = privateExt(existing);
        Servico s = new Servico();
        s.setEventId(eventId);
        s.setTitle(req.getServiceType());
        s.setDescription(req.getServiceType());
        s.setStart(start);
        s.setEnd(end);
        s.setAppointmentStart(window.appointmentStart());
        s.setAppointmentEnd(window.appointmentEnd());
        s.setClientFirstName(req.getClientFirstName());
        s.setClientLastName(req.getClientLastName());
        s.setClientEmail(req.getClientEmail());
        s.setClientPhone(phoneDigits);
        s.setClientCep(req.getClientCep());
        s.setClientStreet(req.getClientStreet());
        s.setClientNeighborhood(req.getClientNeighborhood());
        s.setClientNumber(req.getClientNumber());
        s.setClientComplement(req.getClientComplement());
        s.setClientCity(req.getClientCity());
        s.setClientState(req.getClientState());
        s.setStatus(ext0.getOrDefault("status", "CONFIRMED"));
        s.setAssignedProviderId(ext0.getOrDefault("assignedProviderId", ""));
        s.setAssignedProviderName(ext0.getOrDefault("assignedProviderName", ""));
        s.setAssignedProviderPhone(ext0.getOrDefault("assignedProviderPhone", ""));

        String pe = ext0.get("pendingExpiresAt");
        if (pe != null && pe.matches("\\d+")) {
            s.setPendingExpiresAt(Instant.ofEpochSecond(Long.parseLong(pe)));
        }

        String pv = ext0.get("phoneVerifiedAt");
        if (pv != null && pv.matches("\\d+")) {
            s.setPhoneVerifiedAt(Instant.ofEpochSecond(Long.parseLong(pv)));
        }

        Event updated = calendar.updateEvent(s);
        return mapEventToResponse(updated == null ? existing : updated);
    }

    public List<AvailableSlotResponse> getAvailableSlots(LocalDate date, String city, int slotMinutes) throws IOException {
        validateDateWindow(date);

        if (slotMinutes != props.getBookingSlotMinutes()) {
            throw new BadRequestException("slotMinutes deve ser 60");
        }

        cleanupExpiredPendings();

        List<TimeWindow> allowedWindows = availabilityPolicyService.resolveAllowedWindows(date);
        if (allowedWindows.isEmpty()) {
            return Collections.emptyList();
        }

        int blockDurationMinutes = props.getBookingDurationMinutesForCity(city);
        ZonedDateTime dayStart = ZonedDateTime.of(date, props.getWorkStart(), ZONE);
        ZonedDateTime dayEnd = ZonedDateTime.of(date, props.getWorkEnd(), ZONE);

        DateTime timeMin = new DateTime(Date.from(dayStart.toInstant()));
        DateTime timeMax = new DateTime(Date.from(dayEnd.toInstant()));

        List<TimePeriod> busy = calendar.freeBusy(timeMin, timeMax);
        if (busy == null) {
            busy = Collections.emptyList();
        }

        List<AvailableSlotResponse> slots = new ArrayList<>();
        ZonedDateTime current = dayStart;

        while (!current.plusMinutes(slotMinutes).isAfter(dayEnd)) {
            BookingWindow window = resolveBookingWindow(date, current.toLocalTime(), city);
            Instant slotStart = window.blockStart();
            Instant slotEnd = window.blockEnd();

            TimeWindow requested = new TimeWindow(slotStart, slotEnd);
            if (!isInsideAllowedWindows(requested, allowedWindows)) {
                current = current.plusMinutes(slotMinutes);
                continue;
            }

            boolean conflict = false;
            for (TimePeriod tp : busy) {
                if (tp.getStart() == null || tp.getEnd() == null)
                    continue;

                Instant busyStart = Instant.ofEpochMilli(tp.getStart().getValue());
                Instant busyEnd = Instant.ofEpochMilli(tp.getEnd().getValue());

                if (!(slotEnd.compareTo(busyStart) <= 0 || slotStart.compareTo(busyEnd) >= 0)) {
                    conflict = true;
                    break;
                }
            }

            if (!conflict) {
                slots.add(new AvailableSlotResponse(
                        date.toString(),
                        current.toLocalTime().toString(),
                        ZonedDateTime.ofInstant(window.appointmentEnd(), ZONE).toLocalTime().toString(),
                        blockDurationMinutes));
            }

            current = current.plusMinutes(slotMinutes);
        }

        return slots;
    }

    private BookingWindow resolveBookingWindow(LocalDate date, LocalTime appointmentTime, String city) {
        int slotMinutes = props.getBookingSlotMinutes();
        int blockMinutes = Math.max(slotMinutes, props.getBookingDurationMinutesForCity(city));

        ZonedDateTime appointmentStartZ = ZonedDateTime.of(date, appointmentTime, ZONE);
        ZonedDateTime appointmentEndZ = appointmentStartZ.plusMinutes(slotMinutes);

        if (blockMinutes <= slotMinutes) {
            return new BookingWindow(
                    appointmentStartZ.toInstant(),
                    appointmentEndZ.toInstant(),
                    appointmentStartZ.toInstant(),
                    appointmentEndZ.toInstant(),
                    blockMinutes);
        }

        long minutesBefore = blockMinutes / 2L;
        long minutesAfter = blockMinutes - minutesBefore;
        ZonedDateTime blockStartZ = appointmentStartZ.minusMinutes(minutesBefore);
        ZonedDateTime blockEndZ = appointmentStartZ.plusMinutes(minutesAfter);

        return new BookingWindow(
                blockStartZ.toInstant(),
                blockEndZ.toInstant(),
                appointmentStartZ.toInstant(),
                appointmentEndZ.toInstant(),
                blockMinutes);
    }

    private void validateRequestedWindowAvailable(Instant start, Instant end) throws IOException {
        boolean allowed = availabilityPolicyService.isIntervalAllowed(start, end);
        if (!allowed) {
            throw new BadRequestException("Horário indisponível");
        }
    }

    private boolean isInsideAllowedWindows(TimeWindow requested, List<TimeWindow> allowedWindows) {
        for (TimeWindow allowed : allowedWindows) {
            if (allowed.contains(requested)) {
                return true;
            }
        }
        return false;
    }

    private void validateTime(LocalTime time) {
        if (time == null)
            throw new BadRequestException("time é obrigatório");
        if (!ALLOWED_MINUTES.contains(time.getMinute())) {
            throw new BadRequestException("Minutos inválidos. Use 00.");
        }
    }

    private void validateDateWindow(LocalDate requestedDate) {
        LocalDate today = LocalDate.now(ZONE);

        if (requestedDate == null)
            throw new BadRequestException("date é obrigatório");
        if (requestedDate.isBefore(today))
            throw new BadRequestException("Data inválida: não pode ser no passado");

        YearMonth ymReq = YearMonth.from(requestedDate);
        YearMonth ymNow = YearMonth.from(today);
        YearMonth ymNext = ymNow.plusMonths(1);

        if (!ymReq.equals(ymNow) && !ymReq.equals(ymNext)) {
            throw new BadRequestException("Data inválida: apenas mês atual ou próximo");
        }
    }

    private void validateAdminDateWindow(LocalDate requestedDate) {
        LocalDate today = LocalDate.now(ZONE);
        if (requestedDate == null) {
            throw new BadRequestException("date e obrigatorio");
        }
        LocalDate min = today.minusDays(props.getAdminBookingActivePastDays());
        LocalDate max = today.plusMonths(props.getAdminBookingMaxFutureMonthsAhead());
        if (requestedDate.isBefore(min) || requestedDate.isAfter(max)) {
            throw new BadRequestException("Data fora da janela administrativa permitida");
        }
    }

    private void validateAdminBusyWindow(Event existing, Instant start, Instant end) throws IOException {
        DateTime timeMin = new DateTime(Date.from(start));
        DateTime timeMax = new DateTime(Date.from(end));
        List<TimePeriod> busy = calendar.freeBusy(timeMin, timeMax);
        if (busy == null || busy.isEmpty()) {
            return;
        }

        Instant oldStart = instantFrom(existing.getStart());
        Instant oldEnd = instantFrom(existing.getEnd());
        for (TimePeriod tp : busy) {
            if (tp.getStart() == null || tp.getEnd() == null) {
                throw new ConflictException("Horario indisponivel");
            }
            Instant bs = Instant.ofEpochMilli(tp.getStart().getValue());
            Instant be = Instant.ofEpochMilli(tp.getEnd().getValue());
            boolean isSelf = oldStart != null && oldEnd != null
                    && !bs.isBefore(oldStart)
                    && !be.isAfter(oldEnd);
            if (!isSelf) {
                throw new ConflictException("Horario indisponivel");
            }
        }
    }

    private void validateServiceArea(ServicoRequest req) {
        String reqCityNorm = LocationNormalizer.normalizeCity(req.getClientCity());
        String reqStateUp = LocationNormalizer.normalizeState(req.getClientState());

        Set<String> allowedStates = props.getAllowedStatesUpper();
        if (!allowedStates.isEmpty()) {
            if (reqStateUp.isBlank() || !allowedStates.contains(reqStateUp)) {
                throw new BadRequestException("Atendimento não disponível para este estado");
            }
        }

        Set<String> allowedCities = props.getAllowedCitiesNormalized();
        if (!allowedCities.isEmpty()) {
            if (reqCityNorm.isBlank() || !allowedCities.contains(reqCityNorm)) {
                throw new BadRequestException("Atendimento não disponível para esta cidade");
            }
            return;
        }

        String legacyCity = props.getLegacyCityNormalized();
        if (!legacyCity.isBlank()) {
            if (reqCityNorm.isBlank() || !legacyCity.equals(reqCityNorm)) {
                throw new BadRequestException("Atendimento não disponível para esta cidade");
            }
        }
    }


    private void validateManageWindow(Event event) {
        Instant start = instantFrom(event.getStart());
        if (start == null) {
            throw new BadRequestException("Agendamento inválido");
        }

        Instant cutoff = ZonedDateTime.now(ZONE).plusHours(2).toInstant();
        if (!start.isAfter(cutoff)) {
            throw new BadRequestException("Edição e cancelamento exigem pelo menos 2 horas de antecedência");
        }
    }

    private void validateCityImmutable(ServicoRequest req, Map<String, String> ext) {
        String currentCity = LocationNormalizer.normalizeCity(ext.getOrDefault("clientCity", ""));
        String requestedCity = LocationNormalizer.normalizeCity(req.getClientCity());
        if (!currentCity.equals(requestedCity)) {
            throw new BadRequestException("A cidade do atendimento não pode ser alterada");
        }

        String currentState = LocationNormalizer.normalizeState(ext.getOrDefault("clientState", ""));
        String requestedState = LocationNormalizer.normalizeState(req.getClientState());
        if (!currentState.equals(requestedState)) {
            throw new BadRequestException("O estado do atendimento não pode ser alterado");
        }
    }

    private ZonedDateTime firstDayOfMonth(ZonedDateTime now) {
        return now.withDayOfMonth(1).toLocalDate().atStartOfDay(ZONE);
    }

    private String normalizePhone(String phone) {
        String d = (phone == null) ? "" : phone.replaceAll("\\D", "");
        if (d.length() < 10 || d.length() > 11) {
            throw new BadRequestException("clientPhone inválido");
        }
        return d;
    }

    private Map<String, String> privateExt(Event e) {
        if (e.getExtendedProperties() == null)
            return Collections.emptyMap();
        if (e.getExtendedProperties().getPrivate() == null)
            return Collections.emptyMap();
        return e.getExtendedProperties().getPrivate();
    }

    private Instant instantFrom(EventDateTime edt) {
        if (edt == null)
            return null;
        DateTime dt = edt.getDateTime();
        if (dt == null)
            dt = edt.getDate();
        if (dt == null)
            return null;
        return Instant.ofEpochMilli(dt.getValue());
    }

    private Instant instantFromExt(Map<String, String> ext, String key, Instant fallback) {
        String value = ext.getOrDefault(key, "").trim();
        if (value.isBlank()) {
            return fallback;
        }
        try {
            if (value.matches("\\d+")) {
                return Instant.ofEpochSecond(Long.parseLong(value));
            }
            return Instant.parse(value);
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private boolean isExpiredPending(Map<String, String> ext) {
        String status = ext.getOrDefault("status", "");
        if (!"PENDING_PHONE".equalsIgnoreCase(status))
            return false;

        String pe = ext.get("pendingExpiresAt");
        if (pe == null || !pe.matches("\\d+"))
            return false;

        long exp = Long.parseLong(pe);
        return Instant.now().getEpochSecond() > exp;
    }

    private void cleanupExpiredPendings() throws IOException {
        ZonedDateTime base = firstDayOfMonth(ZonedDateTime.now(ZONE));
        cleanupExpiredPendings(base.minusMonths(props.getHistoryRetentionMonths()), base.plusMonths(2));
    }

    private void cleanupExpiredPendings(LocalDate fromDate, LocalDate toDate) throws IOException {
        ZonedDateTime from = fromDate.atStartOfDay(ZONE);
        ZonedDateTime to = toDate.plusDays(1).atStartOfDay(ZONE);
        cleanupExpiredPendings(from, to);
    }

    private void cleanupExpiredPendings(ZonedDateTime from, ZonedDateTime to) throws IOException {
        List<Event> events = calendar.listBookingEvents(
                new DateTime(Date.from(from.toInstant())),
                new DateTime(Date.from(to.toInstant())));
        if (events == null)
            return;

        for (Event e : events) {
            Map<String, String> ext = privateExt(e);
            if (isExpiredPending(ext)) {
                pendingStore.deleteByEventId(e.getId());
                calendar.deleteEvent(e.getId());
            }
        }
    }

    private boolean hasActivePendingForPhone(String phoneDigits) throws IOException {
        ZonedDateTime base = firstDayOfMonth(ZonedDateTime.now(ZONE));
        ZonedDateTime from = base.minusMonths(props.getHistoryRetentionMonths());
        ZonedDateTime to = base.plusMonths(2);

        List<Event> events = calendar.listEventsByPhone(
                new DateTime(Date.from(from.toInstant())),
                new DateTime(Date.from(to.toInstant())),
                phoneDigits);
        if (events == null)
            return false;

        for (Event e : events) {
            Map<String, String> ext = privateExt(e);
            if (!"PENDING_PHONE".equalsIgnoreCase(ext.getOrDefault("status", "")))
                continue;
            if (isExpiredPending(ext))
                continue;
            return true;
        }
        return false;
    }

    private ServicoResponse mapEventToResponse(Event e) {
        ServicoResponse s = new ServicoResponse();
        s.setEventId(e.getId());
        s.setEventLink(e.getHtmlLink());

        Map<String, String> ext = privateExt(e);

        s.setServiceType(ext.getOrDefault("serviceType", e.getSummary() == null ? "" : e.getSummary()));
        Instant blockStart = instantFrom(e.getStart());
        Instant blockEnd = instantFrom(e.getEnd());
        s.setStart(instantFromExt(ext, "appointmentStart", blockStart));
        s.setEnd(instantFromExt(ext, "appointmentEnd", blockEnd));

        s.setClientFirstName(ext.getOrDefault("clientFirstName", ""));
        s.setClientLastName(ext.getOrDefault("clientLastName", ""));
        s.setClientEmail(ext.getOrDefault("clientEmail", ""));
        s.setClientPhone(ext.getOrDefault("clientPhone", ""));

        s.setClientCep(ext.getOrDefault("clientCep", ""));
        s.setClientStreet(ext.getOrDefault("clientStreet", ""));
        s.setClientNeighborhood(ext.getOrDefault("clientNeighborhood", ""));
        s.setClientNumber(ext.getOrDefault("clientNumber", ""));
        s.setClientComplement(ext.getOrDefault("clientComplement", ""));
        s.setClientCity(ext.getOrDefault("clientCity", ""));
        s.setClientState(ext.getOrDefault("clientState", ""));

        s.setClientAddressLine(buildAddressLine(s));
        s.setStatus(ext.getOrDefault("status", "PENDING_PHONE"));
        s.setAssignedProviderId(ext.getOrDefault("assignedProviderId", ""));
        s.setAssignedProviderName(ext.getOrDefault("assignedProviderName", ""));
        s.setAssignedProviderPhone(ext.getOrDefault("assignedProviderPhone", ""));

        return s;
    }

    private String buildAddressLine(ServicoResponse s) {
        String base = s.getClientStreet() + ", " + s.getClientNumber();
        if (s.getClientComplement() != null && !s.getClientComplement().isBlank()) {
            base += " - " + s.getClientComplement();
        }
        base += " - " + s.getClientNeighborhood()
                + " - " + s.getClientCity() + "/" + s.getClientState()
                + " CEP: " + s.getClientCep();
        return base.trim();
    }

    private Servico servicoFromEvent(Event e) {
        Map<String, String> ext = privateExt(e);

        Servico s = new Servico();
        s.setEventId(e.getId());
        s.setTitle(ext.getOrDefault("serviceType", e.getSummary() == null ? "" : e.getSummary()));
        s.setDescription(e.getDescription() == null ? "" : e.getDescription());
        Instant blockStart = instantFrom(e.getStart());
        Instant blockEnd = instantFrom(e.getEnd());
        s.setStart(blockStart);
        s.setEnd(blockEnd);
        s.setAppointmentStart(instantFromExt(ext, "appointmentStart", blockStart));
        s.setAppointmentEnd(instantFromExt(ext, "appointmentEnd", blockEnd));

        s.setClientFirstName(ext.getOrDefault("clientFirstName", ""));
        s.setClientLastName(ext.getOrDefault("clientLastName", ""));
        s.setClientEmail(ext.getOrDefault("clientEmail", ""));
        s.setClientPhone(ext.getOrDefault("clientPhone", ""));

        s.setClientCep(ext.getOrDefault("clientCep", ""));
        s.setClientStreet(ext.getOrDefault("clientStreet", ""));
        s.setClientNeighborhood(ext.getOrDefault("clientNeighborhood", ""));
        s.setClientNumber(ext.getOrDefault("clientNumber", ""));
        s.setClientComplement(ext.getOrDefault("clientComplement", ""));
        s.setClientCity(ext.getOrDefault("clientCity", ""));
        s.setClientState(ext.getOrDefault("clientState", ""));

        s.setStatus(ext.getOrDefault("status", "PENDING_PHONE"));
        s.setAssignedProviderId(ext.getOrDefault("assignedProviderId", ""));
        s.setAssignedProviderName(ext.getOrDefault("assignedProviderName", ""));
        s.setAssignedProviderPhone(ext.getOrDefault("assignedProviderPhone", ""));

        String pe = ext.get("pendingExpiresAt");
        if (pe != null && pe.matches("\\d+")) {
            s.setPendingExpiresAt(Instant.ofEpochSecond(Long.parseLong(pe)));
        }

        String pv = ext.get("phoneVerifiedAt");
        if (pv != null && pv.matches("\\d+")) {
            s.setPhoneVerifiedAt(Instant.ofEpochSecond(Long.parseLong(pv)));
        }

        return s;
    }
}
