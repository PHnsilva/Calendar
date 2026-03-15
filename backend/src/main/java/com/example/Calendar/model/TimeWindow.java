package com.example.Calendar.model;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

public record TimeWindow(Instant start, Instant end) {

    public TimeWindow {
        if (start == null || end == null) {
            throw new IllegalArgumentException("start e end são obrigatórios");
        }
        if (!end.isAfter(start)) {
            throw new IllegalArgumentException("end deve ser maior que start");
        }
    }

    public boolean overlaps(TimeWindow other) {
        if (other == null) return false;
        return start.isBefore(other.end()) && end.isAfter(other.start());
    }

    public boolean touches(TimeWindow other) {
        if (other == null) return false;
        return end.equals(other.start()) || start.equals(other.end());
    }

    public boolean overlapsOrTouches(TimeWindow other) {
        return overlaps(other) || touches(other);
    }

    public boolean contains(Instant point) {
        if (point == null) return false;
        return !point.isBefore(start) && point.isBefore(end);
    }

    public boolean contains(TimeWindow other) {
        if (other == null) return false;
        return !other.start().isBefore(start) && !other.end().isAfter(end);
    }

    public LocalDate localDate(ZoneId zone) {
        return start.atZone(zone).toLocalDate();
    }
}