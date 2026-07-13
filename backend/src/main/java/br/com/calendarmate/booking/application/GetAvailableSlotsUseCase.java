package br.com.calendarmate.booking.application;

import br.com.calendarmate.booking.domain.BookingWindow;
import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.AvailableSlotResponse;
import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.google.CalendarClient;
import br.com.calendarmate.model.TimeWindow;
import br.com.calendarmate.service.AvailabilityPolicyService;
import br.com.calendarmate.service.store.PendingStore;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.TimePeriod;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * Application use case for the public available-slots flow.
 */
@Service
public class GetAvailableSlotsUseCase {
    private static final Logger log = LoggerFactory.getLogger(GetAvailableSlotsUseCase.class);
    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    private final CalendarClient calendar;
    private final PendingStore pendingStore;
    private final AppProperties props;
    private final AvailabilityPolicyService availabilityPolicyService;

    public GetAvailableSlotsUseCase(
            CalendarClient calendar,
            PendingStore pendingStore,
            AppProperties props,
            AvailabilityPolicyService availabilityPolicyService) {
        this.calendar = calendar;
        this.pendingStore = pendingStore;
        this.props = props;
        this.availabilityPolicyService = availabilityPolicyService;
    }

    public List<AvailableSlotResponse> execute(LocalDate date, String city, int slotMinutes) throws IOException {
        log.info("Availability request date={} city={} slotMinutes={}", date, normalizeLogValue(city), slotMinutes);
        validateDateWindow(date);

        if (slotMinutes != props.getBookingSlotMinutes()) {
            throw new BadRequestException("slotMinutes deve ser 60");
        }

        cleanupExpiredPendings();

        List<TimeWindow> allowedWindows = availabilityPolicyService.resolveAllowedWindows(date);
        if (allowedWindows.isEmpty()) {
            return Collections.emptyList();
        }

        ZonedDateTime dayStart = ZonedDateTime.of(date, LocalTime.MIDNIGHT, ZONE);
        ZonedDateTime dayEnd = dayStart.plusDays(1);
        ZonedDateTime workEnd = ZonedDateTime.of(date, props.getWorkEnd(), ZONE);
        ZonedDateTime firstCandidate = ZonedDateTime.of(date, props.getWorkStart(), ZONE);
        if (isEmptyBookingDay(date) && props.isDistantBookingCity(city)) {
            firstCandidate = ZonedDateTime.of(date, availabilityPolicyService.firstSlotForEmptyDistantDay(city), ZONE);
        }
        Instant minLeadInstant = ZonedDateTime.now(ZONE).plus(props.getBookingMinLeadTime()).toInstant();

        DateTime timeMin = new DateTime(Date.from(dayStart.toInstant()));
        DateTime timeMax = new DateTime(Date.from(dayEnd.toInstant()));

        List<TimePeriod> busy = calendar.freeBusy(timeMin, timeMax);
        if (busy == null) {
            busy = Collections.emptyList();
        }

        List<AvailableSlotResponse> slots = new ArrayList<>();
        ZonedDateTime current = firstCandidate;

        while (!current.plusMinutes(slotMinutes).isAfter(workEnd)) {
            BookingWindow window = availabilityPolicyService.resolveBookingWindow(
                    date,
                    current.toLocalTime(),
                    city,
                    slotMinutes);
            if (window.appointmentStart().isBefore(minLeadInstant)) {
                current = current.plusMinutes(slotMinutes);
                continue;
            }
            Instant slotStart = window.blockStart();
            Instant slotEnd = window.blockEnd();

            TimeWindow requested = new TimeWindow(window.appointmentStart(), window.appointmentEnd());
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
                slots.add(new AvailableSlotResponse(
                        date.toString(),
                        current.toLocalTime().toString(),
                        ZonedDateTime.ofInstant(window.appointmentEnd(), ZONE).toLocalTime().toString(),
                        window.blockMinutes()));
            }

            current = current.plusMinutes(slotMinutes);
        }

        log.info(
                "Availability resolved date={} city={} slotMinutes={} slots={}",
                date,
                normalizeLogValue(city),
                slotMinutes,
                slots.size());
        return slots;
    }

    private boolean isEmptyBookingDay(LocalDate date) throws IOException {
        ZonedDateTime dayStart = ZonedDateTime.of(date, LocalTime.MIDNIGHT, ZONE);
        ZonedDateTime dayEnd = dayStart.plusDays(1);
        List<Event> bookings = calendar.listBookingEvents(
                new DateTime(Date.from(dayStart.toInstant())),
                new DateTime(Date.from(dayEnd.toInstant())));
        return bookings == null || bookings.isEmpty();
    }

    private static String normalizeLogValue(String value) {
        if (value == null || value.isBlank()) {
            return "all";
        }
        return value.trim();
    }

    private void validateDateWindow(LocalDate requestedDate) {
        LocalDate today = LocalDate.now(ZONE);

        if (requestedDate == null) {
            throw new BadRequestException("date \u00e9 obrigat\u00f3rio");
        }
        if (requestedDate.isBefore(today)) {
            throw new BadRequestException("Data inv\u00e1lida: n\u00e3o pode ser no passado");
        }
        if (requestedDate.equals(today)) {
            throw new BadRequestException("Escolha uma data com pelo menos 24 horas de anteced\u00eancia.");
        }

        YearMonth ymReq = YearMonth.from(requestedDate);
        YearMonth ymNow = YearMonth.from(today);
        YearMonth ymNext = ymNow.plusMonths(1);

        if (!ymReq.equals(ymNow) && !ymReq.equals(ymNext)) {
            throw new BadRequestException("Data inv\u00e1lida: apenas m\u00eas atual ou pr\u00f3ximo");
        }
    }

    private void cleanupExpiredPendings() throws IOException {
        ZonedDateTime base = firstDayOfMonth(ZonedDateTime.now(ZONE));
        cleanupExpiredPendings(base.minusMonths(props.getHistoryRetentionMonths()), base.plusMonths(2));
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

    private ZonedDateTime firstDayOfMonth(ZonedDateTime now) {
        return now.withDayOfMonth(1).toLocalDate().atStartOfDay(ZONE);
    }

    private boolean isInsideAllowedWindows(TimeWindow requested, List<TimeWindow> allowedWindows) {
        for (TimeWindow allowed : allowedWindows) {
            if (allowed.contains(requested)) {
                return true;
            }
        }
        return false;
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
}
