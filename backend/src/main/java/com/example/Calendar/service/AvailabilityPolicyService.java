package com.example.Calendar.service;

import com.example.Calendar.config.AppProperties;
import com.example.Calendar.google.CalendarClient;
import com.example.Calendar.model.AvailabilityRuleMode;
import com.example.Calendar.model.TimeWindow;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.Event;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AvailabilityPolicyService {

    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    private final CalendarClient calendar;
    private final AppProperties props;

    public AvailabilityPolicyService(CalendarClient calendar, AppProperties props) {
        this.calendar = calendar;
        this.props = props;
    }

    public List<TimeWindow> resolveAllowedWindows(LocalDate date) throws IOException {
        if (date == null) {
            return Collections.emptyList();
        }

        List<TimeWindow> base = isBaseOffDay(date)
                ? new ArrayList<>()
                : buildBaseWindows(date);

        List<TimeWindow> opens = listRuleWindows(date, AvailabilityRuleMode.OPEN);
        List<TimeWindow> blocks = listRuleWindows(date, AvailabilityRuleMode.BLOCK);

        List<TimeWindow> allowed = new ArrayList<>(base);
        allowed.addAll(opens);
        allowed = mergeWindows(allowed);
        allowed = subtractWindows(allowed, blocks);

        return mergeWindows(allowed);
    }

    public boolean isIntervalAllowed(Instant start, Instant end) throws IOException {
        if (start == null || end == null || !end.isAfter(start)) {
            return false;
        }

        LocalDate startDate = start.atZone(ZONE).toLocalDate();
        LocalDate endDate = end.atZone(ZONE).toLocalDate();

        if (!startDate.equals(endDate)) {
            return false;
        }

        TimeWindow requested = new TimeWindow(start, end);
        List<TimeWindow> allowed = resolveAllowedWindows(startDate);

        for (TimeWindow window : allowed) {
            if (window.contains(requested)) {
                return true;
            }
        }
        return false;
    }

    public boolean hasAnyAvailability(LocalDate date) throws IOException {
        return !resolveAllowedWindows(date).isEmpty();
    }

    public List<TimeWindow> listRuleWindows(LocalDate date, AvailabilityRuleMode mode) throws IOException {
        if (date == null || mode == null) {
            return Collections.emptyList();
        }

        ZonedDateTime dayStart = ZonedDateTime.of(date, props.getWorkStart(), ZONE);
        ZonedDateTime dayEnd = ZonedDateTime.of(date, props.getWorkEnd(), ZONE);

        List<Event> rules = calendar.listAvailabilityRuleEvents(
                new DateTime(Date.from(dayStart.toInstant())),
                new DateTime(Date.from(dayEnd.toInstant()))
        );

        if (rules == null || rules.isEmpty()) {
            return Collections.emptyList();
        }

        List<TimeWindow> out = new ArrayList<>();
        for (Event rule : rules) {
            Map<String, String> ext = privateExt(rule);

            String rawMode = ext.getOrDefault("ruleMode", "").trim().toUpperCase(Locale.ROOT);
            if (!mode.name().equals(rawMode)) {
                continue;
            }

            Instant start = instantFrom(rule.getStart());
            Instant end = instantFrom(rule.getEnd());
            if (start == null || end == null || !end.isAfter(start)) {
                continue;
            }

            out.add(new TimeWindow(start, end));
        }

        return mergeWindows(out);
    }

    private List<TimeWindow> buildBaseWindows(LocalDate date) {
        LocalTime workStart = props.getWorkStart();
        LocalTime workEnd = props.getWorkEnd();
        LocalTime lunchStart = props.getLunchStart();
        LocalTime lunchEnd = props.getLunchEnd();

        List<TimeWindow> out = new ArrayList<>();

        ZonedDateTime dayWorkStart = ZonedDateTime.of(date, workStart, ZONE);
        ZonedDateTime dayWorkEnd = ZonedDateTime.of(date, workEnd, ZONE);
        ZonedDateTime dayLunchStart = ZonedDateTime.of(date, lunchStart, ZONE);
        ZonedDateTime dayLunchEnd = ZonedDateTime.of(date, lunchEnd, ZONE);

        if (lunchStart.isAfter(workStart)) {
            out.add(new TimeWindow(dayWorkStart.toInstant(), dayLunchStart.toInstant()));
        }

        if (workEnd.isAfter(lunchEnd)) {
            out.add(new TimeWindow(dayLunchEnd.toInstant(), dayWorkEnd.toInstant()));
        }

        return out;
    }

    private boolean isBaseOffDay(LocalDate date) {
        LocalDate cycleStart = props.getScheduleCycleStart();
        if (cycleStart == null) {
            return false;
        }
        return new ScheduleRules(cycleStart).isOffDay(date);
    }

    private List<TimeWindow> mergeWindows(List<TimeWindow> windows) {
        if (windows == null || windows.isEmpty()) {
            return Collections.emptyList();
        }

        List<TimeWindow> sorted = new ArrayList<>(windows);
        sorted.sort(Comparator.comparing(TimeWindow::start));

        List<TimeWindow> merged = new ArrayList<>();
        TimeWindow current = sorted.get(0);

        for (int i = 1; i < sorted.size(); i++) {
            TimeWindow next = sorted.get(i);

            if (current.overlapsOrTouches(next)) {
                Instant mergedEnd = current.end().isAfter(next.end()) ? current.end() : next.end();
                current = new TimeWindow(current.start(), mergedEnd);
            } else {
                merged.add(current);
                current = next;
            }
        }

        merged.add(current);
        return merged;
    }

    private List<TimeWindow> subtractWindows(List<TimeWindow> source, List<TimeWindow> toSubtract) {
        if (source == null || source.isEmpty()) {
            return Collections.emptyList();
        }
        if (toSubtract == null || toSubtract.isEmpty()) {
            return mergeWindows(source);
        }

        List<TimeWindow> subtractMerged = mergeWindows(toSubtract);
        List<TimeWindow> current = new ArrayList<>(mergeWindows(source));

        for (TimeWindow block : subtractMerged) {
            List<TimeWindow> nextResult = new ArrayList<>();

            for (TimeWindow window : current) {
                if (!window.overlaps(block)) {
                    nextResult.add(window);
                    continue;
                }

                boolean blockCoversAll = !block.start().isAfter(window.start())
                        && !block.end().isBefore(window.end());
                if (blockCoversAll) {
                    continue;
                }

                boolean cutsLeft = block.start().isAfter(window.start());
                boolean cutsRight = block.end().isBefore(window.end());

                if (cutsLeft) {
                    nextResult.add(new TimeWindow(window.start(), block.start()));
                }
                if (cutsRight) {
                    nextResult.add(new TimeWindow(block.end(), window.end()));
                }
            }

            current = nextResult;
        }

        return mergeWindows(current);
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
}