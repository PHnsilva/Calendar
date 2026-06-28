package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.AvailabilityBlockCreateRequest;
import br.com.calendarmate.dto.AvailabilityBlockPreviewRequest;
import br.com.calendarmate.dto.AvailabilityBlockPreviewResponse;
import br.com.calendarmate.dto.AvailabilityBlockResponse;
import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.exception.ConflictException;
import br.com.calendarmate.google.DummyCalendarClient;
import br.com.calendarmate.model.Servico;
import br.com.calendarmate.service.store.InMemoryPendingStore;
import com.google.api.services.calendar.model.Event;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AvailabilityBlockServiceTest {
    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    @Test
    void conflictingBlockRequiresExplicitCancellationAndPreviewDoesNotMutateCalendar() throws IOException {
        Fixture fixture = fixture();
        LocalDate date = LocalDate.now(ZONE).plusDays(1);
        Event booking = fixture.calendar.createEvent(booking(date, LocalTime.of(9, 0)));
        AvailabilityBlockPreviewRequest previewRequest = previewRequest(date, 9, 10);

        AvailabilityBlockPreviewResponse preview = fixture.service.preview(previewRequest);

        assertEquals(1, preview.getConflictCount());
        assertEquals(booking.getId(), preview.getConflicts().get(0).getEventId());
        assertNotNull(fixture.calendar.getEvent(booking.getId()));
        assertEquals(0, fixture.service.list(date, date).size());

        AvailabilityBlockCreateRequest createRequest = createRequest(date, 9, 10);
        assertThrows(ConflictException.class, () -> fixture.service.create(createRequest));
        assertNotNull(fixture.calendar.getEvent(booking.getId()));
        assertEquals(0, fixture.service.list(date, date).size());

        createRequest.setCancelConflictingBookings(true);
        AvailabilityBlockResponse created = fixture.service.create(createRequest);

        assertNull(fixture.calendar.getEvent(booking.getId()));
        assertEquals("BLOCK", created.getMode());
        assertEquals(1, fixture.service.list(date, date).size());
    }

    @Test
    void adjacentBlocksOfTheSameTypeMergeIntoOneRule() throws IOException {
        Fixture fixture = fixture();
        LocalDate date = LocalDate.now(ZONE).plusDays(1);

        fixture.service.create(createRequest(date, 8, 9));
        fixture.service.create(createRequest(date, 9, 10));

        var rules = fixture.service.list(date, date);
        assertEquals(1, rules.size());
        assertEquals(LocalTime.of(8, 0), rules.get(0).getStart().atZone(ZONE).toLocalTime());
        assertEquals(LocalTime.of(10, 0), rules.get(0).getEnd().atZone(ZONE).toLocalTime());
    }

    @Test
    void deletingManualRuleRejectsBookingIdsWithoutDeletingTheBooking() throws IOException {
        Fixture fixture = fixture();
        LocalDate date = LocalDate.now(ZONE).plusDays(1);
        Event booking = fixture.calendar.createEvent(booking(date, LocalTime.of(9, 0)));

        assertThrows(BadRequestException.class, () -> fixture.service.delete(booking.getId()));
        assertNotNull(fixture.calendar.getEvent(booking.getId()));
    }

    private Fixture fixture() {
        AppProperties properties = new AppProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        AdminBookingOpsService bookingOps = new AdminBookingOpsService(
                calendar,
                new InMemoryPendingStore(),
                properties);
        return new Fixture(calendar, new AvailabilityBlockService(calendar, properties, bookingOps));
    }

    private AvailabilityBlockPreviewRequest previewRequest(LocalDate date, int startHour, int endHour) {
        AvailabilityBlockPreviewRequest request = new AvailabilityBlockPreviewRequest();
        request.setMode("BLOCK");
        request.setType("SLOT");
        request.setStartAt(LocalDateTime.of(date, LocalTime.of(startHour, 0)));
        request.setEndAt(LocalDateTime.of(date, LocalTime.of(endHour, 0)));
        request.setReason("Manutencao");
        return request;
    }

    private AvailabilityBlockCreateRequest createRequest(LocalDate date, int startHour, int endHour) {
        AvailabilityBlockCreateRequest request = new AvailabilityBlockCreateRequest();
        request.setMode("BLOCK");
        request.setType("SLOT");
        request.setStartAt(LocalDateTime.of(date, LocalTime.of(startHour, 0)));
        request.setEndAt(LocalDateTime.of(date, LocalTime.of(endHour, 0)));
        request.setReason("Manutencao");
        return request;
    }

    private Servico booking(LocalDate date, LocalTime time) {
        ZonedDateTime start = ZonedDateTime.of(date, time, ZONE);
        Servico booking = new Servico();
        booking.setTitle("Visita tecnica");
        booking.setServiceNotes("Trocar tomada");
        booking.setStart(start.toInstant());
        booking.setEnd(start.plusHours(1).toInstant());
        booking.setAppointmentStart(start.toInstant());
        booking.setAppointmentEnd(start.plusHours(1).toInstant());
        booking.setStatus("CONFIRMED");
        booking.setClientFirstName("Pedro");
        booking.setClientLastName("Silva");
        booking.setClientPhone("31999999999");
        booking.setClientCity("Itabirito");
        return booking;
    }

    private record Fixture(DummyCalendarClient calendar, AvailabilityBlockService service) {
    }
}
