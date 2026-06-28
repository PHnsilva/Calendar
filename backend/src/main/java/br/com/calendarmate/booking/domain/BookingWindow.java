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

    public static BookingWindow forTravelPolicy(
            LocalDate date,
            LocalTime appointmentTime,
            ZoneId zone,
            int slotMinutes,
            boolean distantCity,
            int distantBlockBeforeMinutes,
            int distantBlockAfterMinutes) {
        ZonedDateTime appointmentStartZ = ZonedDateTime.of(date, appointmentTime, zone);
        ZonedDateTime appointmentEndZ = appointmentStartZ.plusMinutes(slotMinutes);

        if (!distantCity) {
            return new BookingWindow(
                    appointmentStartZ.toInstant(),
                    appointmentEndZ.toInstant(),
                    appointmentStartZ.toInstant(),
                    appointmentEndZ.toInstant(),
                    slotMinutes);
        }

        int before = Math.max(0, distantBlockBeforeMinutes);
        int after = Math.max(slotMinutes, distantBlockAfterMinutes);
        ZonedDateTime blockStartZ = appointmentStartZ.minusMinutes(before);
        ZonedDateTime blockEndZ = appointmentStartZ.plusMinutes(after);

        return new BookingWindow(
                blockStartZ.toInstant(),
                blockEndZ.toInstant(),
                appointmentStartZ.toInstant(),
                appointmentEndZ.toInstant(),
                before + after);
    }
}
