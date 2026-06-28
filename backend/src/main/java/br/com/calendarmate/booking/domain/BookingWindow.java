package br.com.calendarmate.booking.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

public record BookingWindow(
        Instant blockStart,
        Instant blockEnd,
        Instant appointmentStart,
        Instant appointmentEnd,
        int blockMinutes) {

    public static BookingWindow forAppointment(
            LocalDate date,
            LocalTime appointmentTime,
            ZoneId zone,
            int slotMinutes,
            int requestedBlockMinutes) {
        int blockMinutes = Math.max(slotMinutes, requestedBlockMinutes);

        ZonedDateTime appointmentStartZ = ZonedDateTime.of(date, appointmentTime, zone);
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
}
