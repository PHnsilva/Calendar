package com.example.Calendar.service;

import com.example.Calendar.config.AppProperties;
import com.example.Calendar.dto.ServicoCreateResponse;
import com.example.Calendar.dto.ServicoRequest;
import com.example.Calendar.dto.ServicoResponse;
import com.example.Calendar.exception.BadRequestException;
import com.example.Calendar.exception.ConflictException;
import com.example.Calendar.exception.ForbiddenException;
import com.example.Calendar.exception.NotFoundException;
import com.example.Calendar.google.CalendarClient;
import com.example.Calendar.model.PendingRecord;
import com.example.Calendar.model.Servico;
import com.example.Calendar.model.TimeWindow;
import com.example.Calendar.service.store.PendingStore;
import com.example.Calendar.util.LocationNormalizer;
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

    public ServicoService(
            CalendarClient calendar,
            TokenUtil tokenUtil,
            VerificationService verificationService,
            PendingStore pendingStore,
            AppProperties props,
            AvailabilityPolicyService availabilityPolicyService) {
        this.calendar = calendar;
        this.tokenUtil = tokenUtil;
        this.verificationService = verificationService;
        this.pendingStore = pendingStore;
        this.props = props;
        this.availabilityPolicyService = availabilityPolicyService;
    }

    public ServicoCreateResponse create(ServicoRequest req) throws IOException {
        validateDateWindow(req.getDate());
        validateTime(req.getTime());
        validateServiceArea(req);

        String phoneDigits = normalizePhone(req.getClientPhone());

        cleanupExpiredPendings();
        if (props.isBlockOtherBookingsWhenPending() && hasActivePendingForPhone(phoneDigits)) {
            throw new ConflictException("Você já tem um agendamento pendente de confirmação");
        }

        ZonedDateTime startZ = ZonedDateTime.of(req.getDate(), req.getTime(), zone());
        ZonedDateTime endZ = startZ.plusMinutes(props.getBookingSlotMinutes());
        Instant start = startZ.toInstant();
        Instant end = endZ.toInstant();

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

        VerificationService.StartResult otp = verificationService.start(token, phoneDigits);

        ServicoResponse servico = mapEventToResponse(created);
        servico.setStatus("PENDING_PHONE");
        servico.setPendingExpiresAt(pendingExpiresAt);

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

        String phone = normalizePhone(ext.getOrDefault("clientPhone", ""));
        return listByPhone(phone);
    }

    public List<ServicoResponse> listByPhone(String phoneDigits) throws IOException {
        String phone = normalizePhone(phoneDigits);

        cleanupExpiredPendings();

        ZonedDateTime base = firstDayOfMonth(ZonedDateTime.now(zone()));
        ZonedDateTime from = base.minusMonths(props.getHistoryRetentionMonths());
        ZonedDateTime to = base.plusMonths(props.getBookingMaxFutureMonthsAhead() + 1L);

        List<Event> events = calendar.listEventsByPhone(
                new DateTime(Date.from(from.toInstant())),
                new DateTime(Date.from(to.toInstant())),
                phone);
        if (events == null) {
            return Collections.emptyList();
        }

        return events.stream()
                .map(this::mapEventToResponse)
                .sorted(Comparator.comparing(ServicoResponse::getStart, Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());
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

        ZonedDateTime startZ = ZonedDateTime.of(req.getDate(), req.getTime(), zone());
        ZonedDateTime endZ = startZ.plusMinutes(props.getBookingSlotMinutes());
        Instant start = startZ.toInstant();
        Instant end = endZ.toInstant();

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
            if (tp.getStart() == null || tp.getEnd() == null) {
                return true;
            }
            Instant bs = Instant.ofEpochMilli(tp.getStart().getValue());
            Instant be = Instant.ofEpochMilli(tp.getEnd().getValue());
            boolean isSelf = bs.equals(oldStart) && be.equals(oldEnd);
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

        pendingStore.deleteByEventId(eventId);
        calendar.deleteEvent(eventId);
    }

    public List<ServicoResponse> listAllAdmin() throws IOException {
        return listAllAdmin(null, null, null, null);
    }

    public List<ServicoResponse> listAllAdmin(LocalDate fromDate, LocalDate toDate) throws IOException {
        return listAllAdmin(fromDate, toDate, null, null);
    }

    public List<ServicoResponse> listAllAdmin(LocalDate fromDate, LocalDate toDate, String status, String city)
            throws IOException {
        ZonedDateTime base = firstDayOfMonth(ZonedDateTime.now(zone()));

        LocalDate resolvedFrom;
        LocalDate resolvedTo;

        if (fromDate == null && toDate == null) {
            resolvedFrom = base.minusMonths(props.getHistoryRetentionMonths()).toLocalDate();
            resolvedTo = base.plusMonths(props.getBookingMaxFutureMonthsAhead() + 1L).toLocalDate().minusDays(1);
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

        ZonedDateTime from = resolvedFrom.atStartOfDay(zone());
        ZonedDateTime to = resolvedTo.plusDays(1).atStartOfDay(zone());

        List<Event> events = listBookingEventsBetween(from, to);

        String normalizedStatus = normalizeAdminStatus(status);
        String normalizedCity = normalizeAdminCity(city);

        return events.stream()
                .filter(e -> matchesAdminStatus(e, normalizedStatus))
                .filter(e -> matchesAdminCity(e, normalizedCity))
                .map(this::mapEventToResponse)
                .collect(Collectors.toList());
    }

    private List<Event> listBookingEventsBetween(ZonedDateTime from, ZonedDateTime to) throws IOException {
        List<Event> events = calendar.listBookingEvents(
                new DateTime(Date.from(from.toInstant())),
                new DateTime(Date.from(to.toInstant())));
        return events == null ? Collections.emptyList() : events;
    }

    private boolean matchesAdminStatus(Event e, String normalizedStatus) {
        if (normalizedStatus.isBlank()) {
            return true;
        }
        Map<String, String> ext = privateExt(e);
        String current = ext.getOrDefault("status", "PENDING_PHONE");
        return normalizedStatus.equalsIgnoreCase(current);
    }

    private boolean matchesAdminCity(Event e, String normalizedCity) {
        if (normalizedCity.isBlank()) {
            return true;
        }
        Map<String, String> ext = privateExt(e);
        String current = LocationNormalizer.normalizeCity(ext.getOrDefault("clientCity", ""));
        return normalizedCity.equals(current);
    }

    private String normalizeAdminStatus(String status) {
        if (status == null) {
            return "";
        }
        return status.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeAdminCity(String city) {
        if (city == null || city.isBlank()) {
            return "";
        }
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

    public List<String> getAvailableSlots(LocalDate date, int slotMinutes) throws IOException {
        validateDateWindow(date);

        if (slotMinutes != props.getBookingSlotMinutes()) {
            throw new BadRequestException("slotMinutes deve ser " + props.getBookingSlotMinutes());
        }

        cleanupExpiredPendings();

        List<TimeWindow> allowedWindows = availabilityPolicyService.resolveAllowedWindows(date);
        if (allowedWindows.isEmpty()) {
            return Collections.emptyList();
        }

        ZonedDateTime dayStart = ZonedDateTime.of(date, props.getWorkStart(), zone());
        ZonedDateTime dayEnd = ZonedDateTime.of(date, props.getWorkEnd(), zone());

        DateTime timeMin = new DateTime(Date.from(dayStart.toInstant()));
        DateTime timeMax = new DateTime(Date.from(dayEnd.toInstant()));

        List<TimePeriod> busy = calendar.freeBusy(timeMin, timeMax);
        if (busy == null) {
            busy = Collections.emptyList();
        }

        List<ZonedDateTime> slots = new ArrayList<>();
        ZonedDateTime current = dayStart;

        while (!current.plusMinutes(slotMinutes).isAfter(dayEnd)) {
            Instant slotStart = current.toInstant();
            Instant slotEnd = current.plusMinutes(slotMinutes).toInstant();

            TimeWindow requested = new TimeWindow(slotStart, slotEnd);
            if (!isInsideAllowedWindows(requested, allowedWindows)) {
                current = current.plusMinutes(slotMinutes);
                continue;
            }

            boolean conflict = false;
            for (TimePeriod tp : busy) {
                if (tp.getStart() == null || tp.getEnd() == null) {
                    continue;
                }

                Instant busyStart = Instant.ofEpochMilli(tp.getStart().getValue());
                Instant busyEnd = Instant.ofEpochMilli(tp.getEnd().getValue());

                if (!(slotEnd.compareTo(busyStart) <= 0 || slotStart.compareTo(busyEnd) >= 0)) {
                    conflict = true;
                    break;
                }
            }

            if (!conflict) {
                slots.add(current);
            }

            current = current.plusMinutes(slotMinutes);
        }

        return slots.stream()
                .map(z -> z.toOffsetDateTime().toString())
                .collect(Collectors.toList());
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
        if (time == null) {
            throw new BadRequestException("time é obrigatório");
        }
        if (!props.getAllowedMinuteMarks().contains(time.getMinute())) {
            throw new BadRequestException("Minutos inválidos. Valores permitidos: " + props.getAllowedMinuteMarksList());
        }
    }

    private void validateDateWindow(LocalDate requestedDate) {
        LocalDate today = LocalDate.now(zone());

        if (requestedDate == null) {
            throw new BadRequestException("date é obrigatório");
        }
        if (requestedDate.isBefore(today)) {
            throw new BadRequestException("Data inválida: não pode ser no passado");
        }

        YearMonth ymReq = YearMonth.from(requestedDate);
        YearMonth ymNow = YearMonth.from(today);
        YearMonth ymMax = ymNow.plusMonths(props.getBookingMaxFutureMonthsAhead());

        if (ymReq.isBefore(ymNow) || ymReq.isAfter(ymMax)) {
            throw new BadRequestException(buildDateWindowMessage());
        }
    }

    private String buildDateWindowMessage() {
        int maxMonthsAhead = props.getBookingMaxFutureMonthsAhead();
        if (maxMonthsAhead <= 0) {
            return "Data inválida: apenas mês atual";
        }
        if (maxMonthsAhead == 1) {
            return "Data inválida: apenas mês atual ou próximo";
        }
        return "Data inválida: apenas até " + maxMonthsAhead + " mês(es) à frente";
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
        if (!legacyCity.isBlank() && (reqCityNorm.isBlank() || !legacyCity.equals(reqCityNorm))) {
            throw new BadRequestException("Atendimento não disponível para esta cidade");
        }
    }

    private ZonedDateTime firstDayOfMonth(ZonedDateTime now) {
        return now.withDayOfMonth(1).toLocalDate().atStartOfDay(zone());
    }

    private String normalizePhone(String phone) {
        String d = (phone == null) ? "" : phone.replaceAll("\\D", "");
        if (d.length() < 10 || d.length() > 11) {
            throw new BadRequestException("clientPhone inválido");
        }
        return d;
    }

    private Map<String, String> privateExt(Event e) {
        if (e.getExtendedProperties() == null) {
            return Collections.emptyMap();
        }
        if (e.getExtendedProperties().getPrivate() == null) {
            return Collections.emptyMap();
        }
        return e.getExtendedProperties().getPrivate();
    }

    private Instant instantFrom(EventDateTime edt) {
        if (edt == null) {
            return null;
        }
        DateTime dt = edt.getDateTime();
        if (dt == null) {
            dt = edt.getDate();
        }
        if (dt == null) {
            return null;
        }
        return Instant.ofEpochMilli(dt.getValue());
    }

    private boolean isExpiredPending(Map<String, String> ext) {
        String status = ext.getOrDefault("status", "");
        if (!"PENDING_PHONE".equalsIgnoreCase(status)) {
            return false;
        }

        String pe = ext.get("pendingExpiresAt");
        if (pe == null || !pe.matches("\\d+")) {
            return false;
        }

        long exp = Long.parseLong(pe);
        return Instant.now().getEpochSecond() > exp;
    }

    private void cleanupExpiredPendings() throws IOException {
        ZonedDateTime base = firstDayOfMonth(ZonedDateTime.now(zone()));
        cleanupExpiredPendings(base.minusMonths(props.getHistoryRetentionMonths()),
                base.plusMonths(props.getBookingMaxFutureMonthsAhead() + 1L));
    }

    private void cleanupExpiredPendings(LocalDate fromDate, LocalDate toDate) throws IOException {
        ZonedDateTime from = fromDate.atStartOfDay(zone());
        ZonedDateTime to = toDate.plusDays(1).atStartOfDay(zone());
        cleanupExpiredPendings(from, to);
    }

    private void cleanupExpiredPendings(ZonedDateTime from, ZonedDateTime to) throws IOException {
        List<Event> events = calendar.listBookingEvents(
                new DateTime(Date.from(from.toInstant())),
                new DateTime(Date.from(to.toInstant())));
        if (events == null) {
            return;
        }

        for (Event e : events) {
            Map<String, String> ext = privateExt(e);
            if (isExpiredPending(ext)) {
                pendingStore.deleteByEventId(e.getId());
                calendar.deleteEvent(e.getId());
            }
        }
    }

    private boolean hasActivePendingForPhone(String phoneDigits) throws IOException {
        ZonedDateTime base = firstDayOfMonth(ZonedDateTime.now(zone()));
        ZonedDateTime from = base.minusMonths(props.getHistoryRetentionMonths());
        ZonedDateTime to = base.plusMonths(props.getBookingMaxFutureMonthsAhead() + 1L);

        List<Event> events = calendar.listEventsByPhone(
                new DateTime(Date.from(from.toInstant())),
                new DateTime(Date.from(to.toInstant())),
                phoneDigits);
        if (events == null) {
            return false;
        }

        for (Event e : events) {
            Map<String, String> ext = privateExt(e);
            if (!"PENDING_PHONE".equalsIgnoreCase(ext.getOrDefault("status", ""))) {
                continue;
            }
            if (isExpiredPending(ext)) {
                continue;
            }
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
        s.setStart(instantFrom(e.getStart()));
        s.setEnd(instantFrom(e.getEnd()));

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
        s.setPendingExpiresAt(readInstant(ext.get("pendingExpiresAt")));
        s.setPhoneVerifiedAt(readInstant(ext.get("phoneVerifiedAt")));
        return s;
    }

    private Instant readInstant(String raw) {
        if (raw == null || !raw.matches("\\d+")) {
            return null;
        }
        return Instant.ofEpochSecond(Long.parseLong(raw));
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

    private ZoneId zone() {
        return props.getZoneId();
    }
}
