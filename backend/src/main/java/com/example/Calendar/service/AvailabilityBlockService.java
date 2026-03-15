package com.example.Calendar.service;

import com.example.Calendar.config.AppProperties;
import com.example.Calendar.dto.AvailabilityBlockCreateRequest;
import com.example.Calendar.dto.AvailabilityBlockPreviewRequest;
import com.example.Calendar.dto.AvailabilityBlockPreviewResponse;
import com.example.Calendar.dto.AvailabilityBlockResponse;
import com.example.Calendar.dto.AvailabilityConflictItem;
import com.example.Calendar.exception.BadRequestException;
import com.example.Calendar.exception.ConflictException;
import com.example.Calendar.exception.NotFoundException;
import com.example.Calendar.google.CalendarClient;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.Event;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AvailabilityBlockService {

    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");
    private static final Set<Integer> ALLOWED_MINUTES = Set.of(0);

    private final CalendarClient calendar;
    private final AppProperties props;
    private final AdminBookingOpsService adminBookingOpsService;

    public AvailabilityBlockService(
            CalendarClient calendar,
            AppProperties props,
            AdminBookingOpsService adminBookingOpsService
    ) {
        this.calendar = calendar;
        this.props = props;
        this.adminBookingOpsService = adminBookingOpsService;
    }

    public AvailabilityBlockPreviewResponse preview(AvailabilityBlockPreviewRequest req) throws IOException {
        RuleWindow window = resolveWindow(
                req.getMode(),
                req.getType(),
                req.getDate(),
                req.getStartAt(),
                req.getEndAt(),
                req.getReason()
        );

        List<AvailabilityConflictItem> conflicts = "BLOCK".equals(window.mode())
                ? findConflicts(window.start(), window.end())
                : Collections.emptyList();

        AvailabilityBlockPreviewResponse out = new AvailabilityBlockPreviewResponse();
        out.setMode(window.mode());
        out.setType(window.type());
        out.setStart(window.start());
        out.setEnd(window.end());
        out.setReason(window.reason());
        out.setConflictCount(conflicts.size());
        out.setConflicts(conflicts);
        return out;
    }

    public AvailabilityBlockResponse create(AvailabilityBlockCreateRequest req) throws IOException {
        RuleWindow requested = resolveWindow(
                req.getMode(),
                req.getType(),
                req.getDate(),
                req.getStartAt(),
                req.getEndAt(),
                req.getReason()
        );

        List<AvailabilityConflictItem> conflicts = "BLOCK".equals(requested.mode())
                ? findConflicts(requested.start(), requested.end())
                : Collections.emptyList();

        boolean cancelConflicts = Boolean.TRUE.equals(req.getCancelConflictingBookings());
        if (!conflicts.isEmpty() && !cancelConflicts) {
            throw new ConflictException(
                    "Existem agendamentos conflitantes. Faça preview ou envie cancelConflictingBookings=true"
            );
        }

        if (!conflicts.isEmpty()) {
            List<String> ids = conflicts.stream()
                    .map(AvailabilityConflictItem::getEventId)
                    .filter(Objects::nonNull)
                    .filter(s -> !s.isBlank())
                    .collect(Collectors.toList());

            adminBookingOpsService.bulkCancelByIds(ids, safe(requested.reason()));
        }

        Event existingCovering = findExistingCoveringRule(requested);
        if (existingCovering != null) {
            return toResponse(existingCovering);
        }

        RuleWindow merged = mergeWithOverlappingSameModeRules(requested);

        Event created = calendar.createAvailabilityRuleEvent(
                merged.mode(),
                merged.type(),
                merged.start(),
                merged.end(),
                merged.reason()
        );

        return toResponse(created);
    }

    public List<AvailabilityBlockResponse> list(LocalDate fromDate, LocalDate toDate) throws IOException {
        return list(fromDate, toDate, null, null, null);
    }

    public List<AvailabilityBlockResponse> list(
            LocalDate fromDate,
            LocalDate toDate,
            String mode,
            String type,
            String reason
    ) throws IOException {
        ZonedDateTime base = ZonedDateTime.now(ZONE).withDayOfMonth(1).toLocalDate().atStartOfDay(ZONE);

        LocalDate resolvedFrom = (fromDate != null) ? fromDate : base.toLocalDate();
        LocalDate resolvedTo = (toDate != null) ? toDate : base.plusMonths(2).toLocalDate().minusDays(1);

        if (resolvedFrom.isAfter(resolvedTo)) {
            throw new BadRequestException("Parâmetros inválidos: from deve ser <= to");
        }

        String normalizedMode = normalizeOptionalMode(mode);
        String normalizedType = normalizeOptionalType(type);
        String normalizedReason = normalizeOptionalReason(reason);

        List<Event> items = calendar.listAvailabilityRuleEvents(
                new DateTime(Date.from(resolvedFrom.atStartOfDay(ZONE).toInstant())),
                new DateTime(Date.from(resolvedTo.plusDays(1).atStartOfDay(ZONE).toInstant()))
        );

        if (items == null) {
            return Collections.emptyList();
        }

        return items.stream()
                .filter(e -> matchesMode(e, normalizedMode))
                .filter(e -> matchesType(e, normalizedType))
                .filter(e -> matchesReason(e, normalizedReason))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public void delete(String blockId) throws IOException {
        if (blockId == null || blockId.isBlank()) {
            throw new BadRequestException("blockId é obrigatório");
        }

        Event e = calendar.getEvent(blockId);
        if (e == null) {
            throw new NotFoundException("Regra manual não encontrada");
        }

        if (!isAvailabilityRuleEvent(e)) {
            throw new BadRequestException("O evento informado não é uma regra manual de disponibilidade");
        }

        calendar.deleteEvent(blockId);
    }

    private Event findExistingCoveringRule(RuleWindow requested) throws IOException {
        List<Event> rules = calendar.listAvailabilityRuleEvents(
                new DateTime(Date.from(requested.start().minus(Duration.ofDays(1)))),
                new DateTime(Date.from(requested.end().plus(Duration.ofDays(1))))
        );

        if (rules == null || rules.isEmpty()) {
            return null;
        }

        for (Event rule : rules) {
            Map<String, String> ext = privateExt(rule);
            String mode = ext.getOrDefault("ruleMode", "").trim().toUpperCase(Locale.ROOT);
            String type = ext.getOrDefault("blockType", "").trim().toUpperCase(Locale.ROOT);

            if (!requested.mode().equals(mode)) continue;
            if (!requested.type().equals(type)) continue;

            Instant ruleStart = instantFrom(rule.getStart());
            Instant ruleEnd = instantFrom(rule.getEnd());
            if (ruleStart == null || ruleEnd == null) continue;

            boolean covers = !ruleStart.isAfter(requested.start()) && !ruleEnd.isBefore(requested.end());
            if (covers) {
                return rule;
            }
        }

        return null;
    }

    private List<AvailabilityConflictItem> findConflicts(Instant start, Instant end) throws IOException {
        ZonedDateTime from = start.atZone(ZONE).minusDays(1);
        ZonedDateTime to = end.atZone(ZONE).plusDays(1);

        List<Event> events = calendar.listBookingEvents(
                new DateTime(Date.from(from.toInstant())),
                new DateTime(Date.from(to.toInstant()))
        );
        if (events == null || events.isEmpty()) {
            return Collections.emptyList();
        }

        List<AvailabilityConflictItem> out = new ArrayList<>();
        for (Event e : events) {
            Instant evStart = instantFrom(e.getStart());
            Instant evEnd = instantFrom(e.getEnd());
            if (evStart == null || evEnd == null) continue;

            boolean overlaps = evStart.isBefore(end) && evEnd.isAfter(start);
            if (!overlaps) continue;

            out.add(toConflictItem(e));
        }

        return out;
    }

    private RuleWindow mergeWithOverlappingSameModeRules(RuleWindow requested) throws IOException {
        List<Event> rules = calendar.listAvailabilityRuleEvents(
                new DateTime(Date.from(requested.start().minus(Duration.ofDays(1)))),
                new DateTime(Date.from(requested.end().plus(Duration.ofDays(1))))
        );
        if (rules == null || rules.isEmpty()) {
            return requested;
        }

        Instant mergedStart = requested.start();
        Instant mergedEnd = requested.end();

        List<Event> overlappingSameMode = new ArrayList<>();

        for (Event rule : rules) {
            Map<String, String> ext = privateExt(rule);
            String mode = ext.getOrDefault("ruleMode", "").trim().toUpperCase(Locale.ROOT);
            String type = ext.getOrDefault("blockType", "").trim().toUpperCase(Locale.ROOT);

            if (!requested.mode().equals(mode)) continue;
            if (!requested.type().equals(type)) continue;

            Instant ruleStart = instantFrom(rule.getStart());
            Instant ruleEnd = instantFrom(rule.getEnd());
            if (ruleStart == null || ruleEnd == null) continue;

            boolean overlapsOrTouches = !ruleEnd.isBefore(mergedStart) && !ruleStart.isAfter(mergedEnd);
            if (!overlapsOrTouches) continue;

            overlappingSameMode.add(rule);

            if (ruleStart.isBefore(mergedStart)) mergedStart = ruleStart;
            if (ruleEnd.isAfter(mergedEnd)) mergedEnd = ruleEnd;
        }

        if (overlappingSameMode.isEmpty()) {
            return requested;
        }

        for (Event rule : overlappingSameMode) {
            calendar.deleteEvent(rule.getId());
        }

        return new RuleWindow(requested.mode(), requested.type(), mergedStart, mergedEnd, requested.reason());
    }

    private AvailabilityConflictItem toConflictItem(Event e) {
        Map<String, String> ext = privateExt(e);

        AvailabilityConflictItem item = new AvailabilityConflictItem();
        item.setEventId(e.getId());
        item.setServiceType(ext.getOrDefault("serviceType", safe(e.getSummary())));
        item.setStart(instantFrom(e.getStart()));
        item.setEnd(instantFrom(e.getEnd()));
        item.setClientFirstName(ext.getOrDefault("clientFirstName", ""));
        item.setClientLastName(ext.getOrDefault("clientLastName", ""));
        item.setClientPhone(ext.getOrDefault("clientPhone", ""));
        item.setClientCity(ext.getOrDefault("clientCity", ""));
        item.setStatus(ext.getOrDefault("status", "PENDING_PHONE"));
        return item;
    }

    private AvailabilityBlockResponse toResponse(Event e) {
        Map<String, String> ext = privateExt(e);

        AvailabilityBlockResponse out = new AvailabilityBlockResponse();
        out.setBlockId(e.getId());
        out.setMode(ext.getOrDefault("ruleMode", "BLOCK"));
        out.setType(ext.getOrDefault("blockType", ""));
        out.setReason(ext.getOrDefault("blockReason", ""));
        out.setStart(instantFrom(e.getStart()));
        out.setEnd(instantFrom(e.getEnd()));

        String createdAt = ext.getOrDefault("createdAt", "");
        if (createdAt.matches("\\d+")) {
            out.setCreatedAt(Instant.ofEpochSecond(Long.parseLong(createdAt)));
        }

        return out;
    }

    private RuleWindow resolveWindow(
            String rawMode,
            String rawType,
            LocalDate date,
            LocalDateTime startAt,
            LocalDateTime endAt,
            String reason
    ) {
        String mode = normalizeMode(rawMode);
        String type = normalizeType(rawType);

        if ("DAY".equals(type)) {
            if (date == null) {
                throw new BadRequestException("date é obrigatório para regra do tipo DAY");
            }
            validateDateWindow(date);

            Instant start = ZonedDateTime.of(date, props.getWorkStart(), ZONE).toInstant();
            Instant end = ZonedDateTime.of(date, props.getWorkEnd(), ZONE).toInstant();
            return new RuleWindow(mode, type, start, end, safe(reason));
        }

        if (startAt == null || endAt == null) {
            throw new BadRequestException("startAt e endAt são obrigatórios para regra do tipo SLOT");
        }

        validateDateWindow(startAt.toLocalDate());
        validateDateWindow(endAt.toLocalDate());

        validateSlotTime(startAt.toLocalTime());
        validateSlotTime(endAt.toLocalTime());

        Instant start = startAt.atZone(ZONE).toInstant();
        Instant end = endAt.atZone(ZONE).toInstant();

        if (!end.isAfter(start)) {
            throw new BadRequestException("endAt deve ser maior que startAt");
        }

        validateInsideBusinessWindow(start, end);

        return new RuleWindow(mode, type, start, end, safe(reason));
    }

    private void validateSlotTime(LocalTime time) {
        if (time == null) {
            throw new BadRequestException("Horário inválido");
        }
        if (!ALLOWED_MINUTES.contains(time.getMinute())) {
            throw new BadRequestException("Minutos inválidos. Use 00.");
        }
    }

    private void validateInsideBusinessWindow(Instant start, Instant end) {
        LocalTime startTime = start.atZone(ZONE).toLocalTime();
        LocalTime endTime = end.atZone(ZONE).toLocalTime();

        if (startTime.isBefore(props.getWorkStart()) || endTime.isAfter(props.getWorkEnd())) {
            throw new BadRequestException("Regra fora do expediente");
        }

        boolean overlapsLunch = startTime.isBefore(props.getLunchEnd()) && endTime.isAfter(props.getLunchStart());
        if (overlapsLunch) {
            throw new BadRequestException("Regra não pode cobrir horário de almoço");
        }
    }

    private void validateDateWindow(LocalDate requestedDate) {
        LocalDate today = LocalDate.now(ZONE);

        if (requestedDate == null) {
            throw new BadRequestException("date é obrigatório");
        }
        if (requestedDate.isBefore(today)) {
            throw new BadRequestException("Data inválida: não pode ser no passado");
        }

        YearMonth ymReq = YearMonth.from(requestedDate);
        YearMonth ymNow = YearMonth.from(today);
        YearMonth ymNext = ymNow.plusMonths(1);

        if (!ymReq.equals(ymNow) && !ymReq.equals(ymNext)) {
            throw new BadRequestException("Data inválida: apenas mês atual ou próximo");
        }
    }

    private String normalizeMode(String rawMode) {
        String mode = safe(rawMode).trim().toUpperCase(Locale.ROOT);
        if (!"BLOCK".equals(mode) && !"OPEN".equals(mode)) {
            throw new BadRequestException("mode deve ser BLOCK ou OPEN");
        }
        return mode;
    }

    private String normalizeType(String rawType) {
        String type = safe(rawType).trim().toUpperCase(Locale.ROOT);
        if (!"DAY".equals(type) && !"SLOT".equals(type)) {
            throw new BadRequestException("type deve ser DAY ou SLOT");
        }
        return type;
    }

    private String normalizeOptionalMode(String rawMode) {
        if (rawMode == null || rawMode.isBlank()) return "";
        return normalizeMode(rawMode);
    }

    private String normalizeOptionalType(String rawType) {
        if (rawType == null || rawType.isBlank()) return "";
        return normalizeType(rawType);
    }

    private String normalizeOptionalReason(String reason) {
        if (reason == null || reason.isBlank()) return "";
        return reason.trim().toLowerCase(Locale.ROOT);
    }

    private boolean matchesMode(Event e, String normalizedMode) {
        if (normalizedMode.isBlank()) return true;
        Map<String, String> ext = privateExt(e);
        return normalizedMode.equalsIgnoreCase(ext.getOrDefault("ruleMode", ""));
    }

    private boolean matchesType(Event e, String normalizedType) {
        if (normalizedType.isBlank()) return true;
        Map<String, String> ext = privateExt(e);
        return normalizedType.equalsIgnoreCase(ext.getOrDefault("blockType", ""));
    }

    private boolean matchesReason(Event e, String normalizedReason) {
        if (normalizedReason.isBlank()) return true;
        Map<String, String> ext = privateExt(e);
        String blockReason = safe(ext.getOrDefault("blockReason", "")).toLowerCase(Locale.ROOT);
        return blockReason.contains(normalizedReason);
    }

    private boolean isAvailabilityRuleEvent(Event e) {
        Map<String, String> ext = privateExt(e);
        String entityType = ext.getOrDefault("entityType", "");
        return "availability-rule".equalsIgnoreCase(entityType)
                || "availability-block".equalsIgnoreCase(entityType);
    }

    private Map<String, String> privateExt(Event e) {
        if (e.getExtendedProperties() == null) return Collections.emptyMap();
        if (e.getExtendedProperties().getPrivate() == null) return Collections.emptyMap();
        return e.getExtendedProperties().getPrivate();
    }

    private Instant instantFrom(com.google.api.services.calendar.model.EventDateTime edt) {
        if (edt == null) return null;
        DateTime dt = edt.getDateTime();
        if (dt == null) dt = edt.getDate();
        if (dt == null) return null;
        return Instant.ofEpochMilli(dt.getValue());
    }

    private String safe(String s) {
        return s == null ? "" : s.trim();
    }

    private record RuleWindow(String mode, String type, Instant start, Instant end, String reason) {
    }
}