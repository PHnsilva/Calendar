package br.com.calendarmate.service;

import br.com.calendarmate.booking.application.GetAvailableSlotsUseCase;
import br.com.calendarmate.booking.domain.BookingWindow;
import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.AvailableSlotResponse;
import br.com.calendarmate.dto.AdminServicoUpdateRequest;
import br.com.calendarmate.dto.ServicoCreateResponse;
import br.com.calendarmate.dto.ServicoRequest;
import br.com.calendarmate.dto.ServicoResponse;
import br.com.calendarmate.dto.PublicBookingResponse;
import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.exception.ConflictException;
import br.com.calendarmate.exception.ExternalServiceException;
import br.com.calendarmate.exception.ForbiddenException;
import br.com.calendarmate.exception.NotFoundException;
import br.com.calendarmate.exception.ReservedAdminPhoneException;
import br.com.calendarmate.google.CalendarClient;
import br.com.calendarmate.model.PendingRecord;
import br.com.calendarmate.model.Servico;
import br.com.calendarmate.model.AdminPrincipal;
import br.com.calendarmate.model.AdminUser;
import br.com.calendarmate.service.store.BookingHistoryStore;
import br.com.calendarmate.service.store.PendingStore;
import br.com.calendarmate.util.LocationNormalizer;
import br.com.calendarmate.util.PhoneNumberNormalizer;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.api.services.calendar.model.TimePeriod;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

public class ServicoService {

    private static final Logger log = LoggerFactory.getLogger(ServicoService.class);

    private final CalendarClient calendar;
    private final TokenUtil tokenUtil;
    private final VerificationService verificationService;
    private final AppProperties props;
    private final AvailabilityPolicyService availabilityPolicyService;
    private final PendingStore pendingStore;
    private final AdminAuthService adminAuthService;
    private final BookingHistoryStore bookingHistoryStore;
    private final GetAvailableSlotsUseCase getAvailableSlotsUseCase;

    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");
    private static final Set<Integer> ALLOWED_MINUTES = Set.of(0);

    public ServicoService(
            CalendarClient calendar,
            TokenUtil tokenUtil,
            VerificationService verificationService,
            PendingStore pendingStore,
            AppProperties props,
            AvailabilityPolicyService availabilityPolicyService,
            AdminAuthService adminAuthService,
            BookingHistoryStore bookingHistoryStore) {
        this(
                calendar,
                tokenUtil,
                verificationService,
                pendingStore,
                props,
                availabilityPolicyService,
                adminAuthService,
                bookingHistoryStore,
                new GetAvailableSlotsUseCase(calendar, pendingStore, props, availabilityPolicyService));
    }

    public ServicoService(
            CalendarClient calendar,
            TokenUtil tokenUtil,
            VerificationService verificationService,
            PendingStore pendingStore,
            AppProperties props,
            AvailabilityPolicyService availabilityPolicyService,
            AdminAuthService adminAuthService,
            BookingHistoryStore bookingHistoryStore,
            GetAvailableSlotsUseCase getAvailableSlotsUseCase) {
        this.calendar = calendar;
        this.tokenUtil = tokenUtil;
        this.verificationService = verificationService;
        this.pendingStore = pendingStore;
        this.props = props;
        this.availabilityPolicyService = availabilityPolicyService;
        this.adminAuthService = adminAuthService;
        this.bookingHistoryStore = bookingHistoryStore;
        this.getAvailableSlotsUseCase = getAvailableSlotsUseCase;
    }

    public ServicoCreateResponse create(ServicoRequest req) throws IOException {
        validateDateWindow(req.getDate());
        validateTime(req.getTime());
        validatePublicLeadTime(req.getDate(), req.getTime());
        validateServiceArea(req);
        String serviceNotes = normalizeServiceNotes(req.getServiceNotes(), req.getServiceType());

        String phoneDigits = normalizePhone(req.getClientPhone());
        validateReservedPhonePassword(phoneDigits, req.getReservedPhonePassword());

        cleanupExpiredPendings();

        BookingWindow window = resolveBookingWindow(req.getDate(), req.getTime(), req.getClientCity());
        Instant start = window.blockStart();
        Instant end = window.blockEnd();

        if (!end.isAfter(start)) {
            throw new BadRequestException("Horário inválido");
        }

        validateRequestedWindowAvailable(window, req.getClientCity());

        DateTime timeMin = new DateTime(Date.from(start));
        DateTime timeMax = new DateTime(Date.from(end));
        List<TimePeriod> busy = calendar.freeBusy(timeMin, timeMax);
        if (busy != null && !busy.isEmpty()) {
            throw new ConflictException("Horário indisponível");
        }

        Servico s = new Servico();
        s.setId(UUID.randomUUID().toString());

        s.setTitle(req.getServiceType());
        s.setDescription(serviceNotes);
        s.setServiceNotes(serviceNotes);

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
        s.setClientLatitude(req.getClientLatitude());
        s.setClientLongitude(req.getClientLongitude());

        s.setStatus("CONFIRMED");
        s.setPhoneVerifiedAt(Instant.now());
        s.setPendingExpiresAt(null);

        Event created = calendar.createEvent(s);
        if (created == null || created.getId() == null || created.getId().isBlank()) {
            throw new ExternalServiceException("Resposta invalida do calendario ao criar agendamento.");
        }

        String token = tokenUtil.generate(created.getId(), req.getClientEmail());
        pendingStore.deleteByEventId(created.getId());

        ServicoResponse servico = mapEventToResponse(created);
        servico.setStatus("CONFIRMED");
        persistBookingSnapshot(servico);

        ServicoCreateResponse out = new ServicoCreateResponse();
        out.setServico(servico);
        out.setManageToken(token);
        out.setVerificationId("");
        out.setExpiresInSeconds(0);
        out.setResendAfterSeconds(0);
        out.setPendingExpiresAt(null);

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
        // History is read-only and must remain reachable from the signed capability
        // saved when the booking was created, even after its mutation window expires.
        TokenUtil.VerifiedToken vt = tokenUtil.verifyForHistory(token);
        if (vt == null) {
            throw new ForbiddenException("Token inválido");
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

        List<ServicoResponse> bookings = listByPhone(phone);
        if (vt.getExp() >= Instant.now().getEpochSecond()) {
            return bookings;
        }

        // An expired capability may recover history, but it must not become a
        // permanent way to inspect new/future appointments for the same phone.
        Instant now = Instant.now();
        return bookings.stream()
                .filter(booking -> {
                    Instant end = booking.getEnd() == null ? booking.getStart() : booking.getEnd();
                    return end != null && !end.isAfter(now);
                })
                .collect(Collectors.toList());
    }

    public List<ServicoResponse> listByPhone(String phoneDigits) throws IOException {
        String phone = normalizePhone(phoneDigits);

        cleanupExpiredPendings();

        return listEventsByPhone(phone).stream()
                .map(this::mapEventToResponse)
                .collect(Collectors.toList());
    }

    public List<PublicBookingResponse> listPublicBookingsByPhone(String phoneDigits) throws IOException {
        String phone = normalizePhone(phoneDigits);
        log.info("Public booking lookup attempted phone={}", fingerprint(phone));
        cleanupExpiredPendings();

        List<ServicoResponse> live = listEventsByPhone(phone).stream()
                .map(this::mapEventToResponse)
                .toList();
        List<ServicoResponse> stored = bookingHistoryStore.listByPhone(phone, 1000);
        List<PublicBookingResponse> result = mergeBookingRecords(live, stored).stream()
                .filter(item -> phone.equals(normalizePhoneOrBlank(item.getClientPhone())))
                .sorted(Comparator.comparing(ServicoResponse::getStart, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toPublicBooking)
                .toList();
        log.info("Public booking lookup completed phone={} count={}", fingerprint(phone), result.size());
        return result;
    }

    public PublicBookingResponse cancelPublicBooking(String eventId, String phoneDigits) throws IOException {
        String phone = normalizePhone(phoneDigits);
        String normalizedEventId = eventId == null ? "" : eventId.trim();
        if (normalizedEventId.isBlank()) throw new BadRequestException("eventId e obrigatorio");
        log.info("Public booking cancellation attempted booking={} phone={}", fingerprint(normalizedEventId), fingerprint(phone));

        ServicoResponse stored = bookingHistoryStore.listByPhone(phone, 1000).stream()
                .filter(item -> normalizedEventId.equals(item.getEventId()))
                .findFirst()
                .orElse(null);
        Event event = calendar.getEvent(normalizedEventId);

        if (event == null) {
            if (stored != null) {
                if ("CANCELLED".equalsIgnoreCase(stored.getStatus())) {
                    return toPublicBooking(stored);
                }
                validateManageWindow(stored.getStart());
                stored.setStatus("CANCELLED");
                stored.setCancellationAt(Instant.now());
                stored.setCancellationSource("CUSTOMER_PHONE_LOOKUP");
                persistBookingSnapshot(stored);
                log.info("Public booking cancellation succeeded booking={} phone={} idempotent=false providerEventMissing=true",
                        fingerprint(normalizedEventId), fingerprint(phone));
                return toPublicBooking(stored);
            }
            log.warn("Public cancellation ownership check failed booking={} phone={}", fingerprint(normalizedEventId), fingerprint(phone));
            throw new NotFoundException("Agendamento nao encontrado");
        }

        String ownerPhone = normalizePhoneOrBlank(privateExt(event).getOrDefault("clientPhone", ""));
        if (!phone.equals(ownerPhone)) {
            log.warn("Public cancellation ownership check failed booking={} phone={}", fingerprint(normalizedEventId), fingerprint(phone));
            throw new NotFoundException("Agendamento nao encontrado");
        }

        Map<String, String> ext = privateExt(event);
        boolean providerAlreadyCancelled = "CANCELLED".equalsIgnoreCase(ext.getOrDefault("status", ""));
        boolean historyAlreadyCancelled = stored != null && "CANCELLED".equalsIgnoreCase(stored.getStatus());
        if (providerAlreadyCancelled) {
            ServicoResponse result = stored == null ? mapEventToResponse(event) : stored;
            log.info("Public booking cancellation succeeded booking={} phone={} idempotent=true",
                    fingerprint(normalizedEventId), fingerprint(phone));
            return toPublicBooking(result);
        }

        boolean alreadyCancelled = historyAlreadyCancelled;
        if (!alreadyCancelled) validateManageWindow(event);

        ServicoResponse result = cancelEventAndPreserveHistory(
                event,
                "CUSTOMER_PHONE_LOOKUP",
                stored);
        log.info("Public booking cancellation succeeded booking={} phone={} idempotent={}",
                fingerprint(normalizedEventId), fingerprint(phone), alreadyCancelled);
        return toPublicBooking(result);
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
        validatePublicLeadTime(req.getDate(), req.getTime());
        validateServiceArea(req);

        TokenUtil.VerifiedToken vt = tokenUtil.verify(token);
        if (vt == null || !vt.getEventId().equals(eventId)) {
            throw new ForbiddenException("Token inválido");
        }

        Event existing = calendar.getEvent(eventId);
        if (existing == null) {
            throw new NotFoundException("Agendamento não encontrado");
        }

        String serviceNotes = normalizeUpdatedServiceNotes(req.getServiceNotes(), existing);
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

        validateRequestedWindowAvailable(window, req.getClientCity());

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
        validateReservedPhonePassword(phoneDigits, req.getReservedPhonePassword());

        Servico s = new Servico();
        s.setEventId(eventId);
        s.setTitle(req.getServiceType());
        s.setDescription(serviceNotes);
        s.setServiceNotes(serviceNotes);
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
        s.setClientLatitude(req.getClientLatitude());
        s.setClientLongitude(req.getClientLongitude());

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

        ServicoResponse response = mapEventToResponse(updated);
        persistBookingSnapshot(response);
        return response;
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

        cancelEventAndPreserveHistory(e, "CUSTOMER_MANAGE_TOKEN", null);
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
        LocalDate today = LocalDate.now(ZONE);

        LocalDate resolvedFrom;
        LocalDate resolvedTo;

        if (fromDate == null && toDate == null) {
            resolvedFrom = today;
            resolvedTo = today.plusDays(7);
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

        ZonedDateTime from = resolvedFrom.atStartOfDay(ZONE);
        ZonedDateTime to = resolvedTo.plusDays(1).atStartOfDay(ZONE);

        List<Event> events = listBookingEventsBetween(from, to);

        String normalizedStatus = normalizeAdminStatus(status);
        String normalizedCity = normalizeAdminCity(city);

        return events.stream()
                .filter(e -> !isExpiredPending(privateExt(e)))
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
        Instant historyEnd = LocalDate.now(ZONE).plusDays(1).atStartOfDay(ZONE).toInstant();

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

        List<ServicoResponse> stored = bookingHistoryStore.list(from, to, assignedProviderId);
        List<ServicoResponse> live = listBookingEventsBetween(
                ZonedDateTime.ofInstant(from, ZONE),
                ZonedDateTime.ofInstant(to, ZONE)).stream()
                .filter(event -> canPrincipalAccessEvent(principal, event))
                .map(this::mapEventToResponse)
                .toList();

        return mergeBookingRecords(live, stored).stream()
                .filter(item -> normalizedStatus.isBlank() || normalizedStatus.equalsIgnoreCase(item.getStatus()))
                .filter(item -> normalizedCity.isBlank() || normalizedCity.equals(LocationNormalizer.normalizeCity(item.getClientCity())))
                .sorted(Comparator.comparing(ServicoResponse::getStart, Comparator.nullsLast(Comparator.reverseOrder())))
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

        cancelEventAndPreserveHistory(e, "ADMIN", null);
    }

    public ServicoResponse getByIdAdmin(String eventId, AdminPrincipal principal) throws IOException {
        Event existing = calendar.getEvent(eventId);
        if (existing == null) {
            throw new NotFoundException("Agendamento não encontrado");
        }
        if (!canPrincipalAccessEvent(principal, existing)) {
            throw new ForbiddenException("Agendamento não designado para este prestador");
        }
        if (!isActiveAdminBooking(existing)) {
            throw new NotFoundException("Agendamento não encontrado");
        }
        return mapEventToResponse(existing);
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
        ServicoResponse response = mapEventToResponse(updated == null ? existing : updated);
        persistBookingSnapshot(response);
        return response;
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

    public ServicoResponse updateByIdAdmin(String eventId, AdminPrincipal principal, AdminServicoUpdateRequest req) throws IOException {
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
        validateServiceArea(req.getClientCity(), req.getClientState());
        String serviceNotes = normalizeUpdatedServiceNotes(req.getServiceNotes(), existing);

        BookingWindow window = resolveBookingWindow(req.getDate(), req.getTime(), req.getClientCity());
        Instant start = window.blockStart();
        Instant end = window.blockEnd();
        if (!end.isAfter(start)) {
            throw new BadRequestException("Horario invalido");
        }

        validateRequestedWindowAvailable(window, req.getClientCity());
        validateAdminBusyWindow(existing, start, end);

        String phoneDigits = normalizePhone(req.getClientPhone());
        Map<String, String> ext0 = privateExt(existing);
        Servico s = new Servico();
        s.setEventId(eventId);
        s.setTitle(req.getServiceType());
        s.setDescription(serviceNotes);
        s.setServiceNotes(serviceNotes);
        s.setStart(start);
        s.setEnd(end);
        s.setAppointmentStart(window.appointmentStart());
        s.setAppointmentEnd(window.appointmentEnd());
        s.setClientFirstName(req.getClientFirstName());
        s.setClientLastName(ext0.getOrDefault("clientLastName", ""));
        s.setClientEmail(req.getClientEmail());
        s.setClientPhone(phoneDigits);
        s.setClientCep(req.getClientCep());
        s.setClientStreet(req.getClientStreet());
        s.setClientNeighborhood(req.getClientNeighborhood());
        s.setClientNumber(req.getClientNumber());
        s.setClientComplement(req.getClientComplement());
        s.setClientCity(req.getClientCity());
        s.setClientState(req.getClientState());
        s.setClientLatitude(req.getClientLatitude() == null ? doubleFromExt(ext0, "clientLatitude") : req.getClientLatitude());
        s.setClientLongitude(req.getClientLongitude() == null ? doubleFromExt(ext0, "clientLongitude") : req.getClientLongitude());
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
        ServicoResponse response = mapEventToResponse(updated == null ? existing : updated);
        persistBookingSnapshot(response);
        return response;
    }

    public List<AvailableSlotResponse> getAvailableSlots(LocalDate date, String city, int slotMinutes) throws IOException {
        return getAvailableSlotsUseCase.execute(date, city, slotMinutes);
    }

    private BookingWindow resolveBookingWindow(LocalDate date, LocalTime appointmentTime, String city) {
        return availabilityPolicyService.resolveBookingWindow(
                date,
                appointmentTime,
                city,
                props.getBookingSlotMinutes());
    }

    private void validateRequestedWindowAvailable(BookingWindow window, String city) throws IOException {
        boolean allowed = availabilityPolicyService.isAppointmentAllowed(window.appointmentStart(), window.appointmentEnd());
        LocalDate appointmentDate = window.appointmentStart().atZone(ZONE).toLocalDate();
        LocalTime appointmentTime = window.appointmentStart().atZone(ZONE).toLocalTime();
        if (!allowed) {
            throw new BadRequestException("Horário indisponível");
        }
        if (availabilityPolicyService.isBeforeEmptyDistantDayStart(appointmentTime, city)
                && isBookingDayEmpty(appointmentDate)) {
            throw new BadRequestException("Horario indisponivel");
        }
    }

    private boolean isBookingDayEmpty(LocalDate date) throws IOException {
        ZonedDateTime dayStart = date.atStartOfDay(ZONE);
        ZonedDateTime dayEnd = dayStart.plusDays(1);
        List<Event> events = listBookingEventsBetween(dayStart, dayEnd);
        return events.isEmpty();
    }

    private String normalizeServiceNotes(String value, String serviceType) {
        String notes = value == null ? "" : value.trim().replaceAll("\\s+", " ");
        if (notes.isBlank()) return "";
        if (notes.length() < 10) {
            throw new BadRequestException("Observacao deve ter pelo menos 10 caracteres quando informada");
        }
        if (notes.length() > 2000) {
            throw new BadRequestException("Observacao deve ter no maximo 2000 caracteres");
        }
        return notes;
    }

    private String normalizeUpdatedServiceNotes(String value, Event existing) {
        if (value == null) return resolveServiceNotes(privateExt(existing), existing);
        return normalizeServiceNotes(value, null);
    }

    private String resolveServiceNotes(Map<String, String> ext, Event event) {
        String fromExt = ext.getOrDefault("serviceNotes", "").trim();
        if (!fromExt.isBlank()) {
            return fromExt;
        }
        return event == null || event.getDescription() == null ? "" : event.getDescription().trim();
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

    private void validatePublicLeadTime(LocalDate requestedDate, LocalTime requestedTime) {
        if (requestedDate == null || requestedTime == null) {
            return;
        }
        ZonedDateTime appointmentStart = ZonedDateTime.of(requestedDate, requestedTime, ZONE);
        ZonedDateTime minimumStart = ZonedDateTime.now(ZONE).plus(props.getBookingMinLeadTime());
        if (!requestedDate.isAfter(LocalDate.now(ZONE)) || appointmentStart.isBefore(minimumStart)) {
            throw new BadRequestException("Escolha uma data com pelo menos 24 horas de antecedencia.");
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
        validateServiceArea(req.getClientCity(), req.getClientState());
    }

    private void validateServiceArea(String city, String state) {
        String reqCityNorm = LocationNormalizer.normalizeCity(city);
        String reqStateUp = LocationNormalizer.normalizeState(state);

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
        validateManageWindow(instantFrom(event.getStart()));
    }

    private void validateManageWindow(Instant start) {
        if (start == null) {
            throw new BadRequestException("Agendamento inválido");
        }

        Instant cutoff = ZonedDateTime.now(ZONE).plus(props.getBookingCancellationNotice()).toInstant();
        if (!start.isAfter(cutoff)) {
            throw new BadRequestException("Cancelamento exige pelo menos " + props.getBookingCancellationNoticeHours() + " horas de antecedencia");
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
        return PhoneNumberNormalizer.normalizeBrazilianMobilePhone(phone);
    }

    private String normalizePhoneOrBlank(String phone) {
        return PhoneNumberNormalizer.normalizeBrazilianMobilePhoneOrBlank(phone);
    }

    private List<ServicoResponse> mergeBookingRecords(List<ServicoResponse> live, List<ServicoResponse> stored) {
        Map<String, ServicoResponse> byId = new LinkedHashMap<>();
        if (stored != null) {
            for (ServicoResponse item : stored) {
                if (item != null && item.getEventId() != null) byId.put(item.getEventId(), item);
            }
        }
        if (live != null) {
            for (ServicoResponse item : live) {
                if (item == null || item.getEventId() == null) continue;
                ServicoResponse existing = byId.get(item.getEventId());
                if (existing != null
                        && "CANCELLED".equalsIgnoreCase(existing.getStatus())
                        && !"CANCELLED".equalsIgnoreCase(item.getStatus())) {
                    continue;
                }
                byId.put(item.getEventId(), item);
            }
        }
        return new ArrayList<>(byId.values());
    }

    private PublicBookingResponse toPublicBooking(ServicoResponse source) {
        PublicBookingResponse out = new PublicBookingResponse();
        out.setEventId(source.getEventId());
        out.setServiceType(source.getServiceType());
        out.setStart(source.getStart());
        out.setStatus(source.getStatus());
        return out;
    }

    private void persistBookingSnapshot(ServicoResponse booking) {
        bookingHistoryStore.upsert(booking, Instant.now().getEpochSecond());
    }

    private ServicoResponse cancelEventAndPreserveHistory(Event event, String source, ServicoResponse stored) throws IOException {
        ServicoResponse snapshot = mapEventToResponse(event);
        snapshot.setStatus("CANCELLED");
        snapshot.setCancellationAt(stored != null && stored.getCancellationAt() != null
                ? stored.getCancellationAt()
                : Instant.now());
        snapshot.setCancellationSource(source);

        // Persist first so the complete booking survives a provider failure. The
        // calendar operation then patches only cancellation metadata, avoiding a
        // full event rewrite and keeping the cancelled item available to history.
        persistBookingSnapshot(snapshot);
        Event updated = calendar.cancelEvent(event.getId(), snapshot.getCancellationAt(), source);
        pendingStore.deleteByEventId(event.getId());
        ServicoResponse result = updated == null ? snapshot : mapEventToResponse(updated);
        persistBookingSnapshot(result);
        return result;
    }

    private String fingerprint(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest((value == null ? "" : value).getBytes(StandardCharsets.UTF_8));
            StringBuilder out = new StringBuilder();
            for (int i = 0; i < Math.min(6, digest.length); i++) out.append(String.format("%02x", digest[i]));
            return out.toString();
        } catch (Exception ignored) {
            return "unavailable";
        }
    }

    private void validateReservedPhonePassword(String phoneDigits, String password) {
        if (adminAuthService.isAdminPhoneBestEffort(phoneDigits)
                && !adminAuthService.isReservedPhonePasswordValid(password)) {
            throw new ReservedAdminPhoneException("Senha obrigatoria para usar telefone de administrador ou prestador.");
        }
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

    private Double doubleFromExt(Map<String, String> ext, String key) {
        String value = ext.getOrDefault(key, "").trim();
        if (value.isBlank()) {
            return null;
        }
        try {
            double parsed = Double.parseDouble(value);
            return Double.isFinite(parsed) ? parsed : null;
        } catch (NumberFormatException ignored) {
            return null;
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
        if (events == null || events.isEmpty())
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
        s.setServiceNotes(resolveServiceNotes(ext, e));
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
        s.setClientLatitude(doubleFromExt(ext, "clientLatitude"));
        s.setClientLongitude(doubleFromExt(ext, "clientLongitude"));

        s.setClientAddressLine(buildAddressLine(s));
        s.setStatus(ext.getOrDefault("status", "PENDING_PHONE"));
        s.setCancellationAt(instantFromExt(ext, "cancellationAt", null));
        s.setCancellationSource(ext.getOrDefault("cancellationSource", ""));
        s.setAssignedProviderId(ext.getOrDefault("assignedProviderId", ""));
        s.setAssignedProviderName(ext.getOrDefault("assignedProviderName", ""));
        s.setAssignedProviderPhone(ext.getOrDefault("assignedProviderPhone", ""));

        return s;
    }

    private String buildAddressLine(ServicoResponse s) {
        List<String> parts = new ArrayList<>();
        String street = cleanAddressPart(s.getClientStreet());
        String number = cleanAddressPart(s.getClientNumber());
        if (!street.isBlank() || !number.isBlank()) {
            parts.add((street + (street.isBlank() || number.isBlank() ? "" : ", ") + number).trim());
        }
        addAddressPart(parts, s.getClientComplement());
        addAddressPart(parts, s.getClientNeighborhood());
        String city = cleanAddressPart(s.getClientCity());
        String state = cleanAddressPart(s.getClientState());
        if (!city.isBlank() || !state.isBlank()) {
            parts.add((city + (city.isBlank() || state.isBlank() ? "" : "/") + state).trim());
        }
        String cep = cleanAddressPart(s.getClientCep());
        if (!cep.isBlank()) {
            parts.add("CEP: " + cep);
        }
        return String.join(" - ", parts);
    }

    private void addAddressPart(List<String> parts, String value) {
        String cleaned = cleanAddressPart(value);
        if (!cleaned.isBlank()) parts.add(cleaned);
    }

    private String cleanAddressPart(String value) {
        return value == null ? "" : value.trim();
    }

    private Servico servicoFromEvent(Event e) {
        Map<String, String> ext = privateExt(e);

        Servico s = new Servico();
        s.setEventId(e.getId());
        s.setTitle(ext.getOrDefault("serviceType", e.getSummary() == null ? "" : e.getSummary()));
        String serviceNotes = resolveServiceNotes(ext, e);
        s.setDescription(serviceNotes);
        s.setServiceNotes(serviceNotes);
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
        s.setClientLatitude(doubleFromExt(ext, "clientLatitude"));
        s.setClientLongitude(doubleFromExt(ext, "clientLongitude"));

        s.setStatus(ext.getOrDefault("status", "PENDING_PHONE"));
        s.setCancellationAt(instantFromExt(ext, "cancellationAt", null));
        s.setCancellationSource(ext.getOrDefault("cancellationSource", ""));
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
