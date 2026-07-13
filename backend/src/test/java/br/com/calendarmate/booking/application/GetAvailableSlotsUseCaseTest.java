package br.com.calendarmate.booking.application;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.AvailabilityBlockCreateRequest;
import br.com.calendarmate.dto.AvailableSlotResponse;
import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.google.DummyCalendarClient;
import br.com.calendarmate.model.Servico;
import br.com.calendarmate.service.AdminBookingOpsService;
import br.com.calendarmate.service.AvailabilityBlockService;
import br.com.calendarmate.service.AvailabilityPolicyService;
import br.com.calendarmate.service.store.InMemoryPendingStore;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GetAvailableSlotsUseCaseTest {
    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    @Test
    void returnsOpenSlotsForAvailableDate() throws IOException {
        Fixture fixture = new Fixture();
        LocalDate date = nextAvailableDate(fixture.calendar, fixture.props);

        List<AvailableSlotResponse> slots = fixture.useCase.execute(date, "Itabirito", fixture.props.getBookingSlotMinutes());

        assertFalse(slots.isEmpty());
        assertTrue(slots.stream().allMatch(slot -> date.toString().equals(slot.getDate())));
        assertTrue(slots.stream().allMatch(slot -> slot.getStartTime().endsWith(":00")));
    }

    @Test
    void rejectsPastDate() {
        Fixture fixture = new Fixture();

        BadRequestException ex = assertThrows(
                BadRequestException.class,
                () -> fixture.useCase.execute(LocalDate.now(ZONE).minusDays(1), "Itabirito", fixture.props.getBookingSlotMinutes()));

        assertTrue(ex.getMessage().contains("passado"));
    }

    @Test
    void rejectsInvalidSlotMinutes() throws IOException {
        Fixture fixture = new Fixture();
        LocalDate date = nextAvailableDate(fixture.calendar, fixture.props);

        BadRequestException ex = assertThrows(
                BadRequestException.class,
                () -> fixture.useCase.execute(date, "Itabirito", 30));

        assertTrue(ex.getMessage().contains("slotMinutes"));
    }

    @Test
    void excludesOccupiedCalendarWindow() throws IOException {
        Fixture fixture = new Fixture();
        LocalDate date = nextAvailableDate(fixture.calendar, fixture.props);
        AvailableSlotResponse occupiedSlot = fixture.useCase.execute(date, "Itabirito", fixture.props.getBookingSlotMinutes()).get(0);

        fixture.calendar.createEvent(confirmedBooking(date, LocalTime.parse(occupiedSlot.getStartTime())));

        List<AvailableSlotResponse> remaining = fixture.useCase.execute(date, "Itabirito", fixture.props.getBookingSlotMinutes());

        assertFalse(remaining.stream().anyMatch(slot -> occupiedSlot.getStartTime().equals(slot.getStartTime())));
    }

    @Test
    void itabiritoBookingBlocksOnlyOneHourlySlot() throws IOException {
        Fixture fixture = new Fixture();
        LocalDate date = nextAvailableDate(fixture.calendar, fixture.props);

        fixture.calendar.createEvent(confirmedBooking(date, LocalTime.of(9, 0)));

        List<AvailableSlotResponse> remaining = fixture.useCase.execute(date, "Itabirito", fixture.props.getBookingSlotMinutes());

        assertFalse(hasSlot(remaining, "09:00"));
        assertTrue(hasSlot(remaining, "10:00"));
    }

    @Test
    void distantCityBookingBlocksTravelServiceAndReturnWindow() throws IOException {
        Fixture fixture = new Fixture();
        LocalDate date = nextAvailableDate(fixture.calendar, fixture.props);

        fixture.calendar.createEvent(distantBooking(date, LocalTime.of(10, 0)));

        List<AvailableSlotResponse> remaining = fixture.useCase.execute(date, "Itabirito", fixture.props.getBookingSlotMinutes());

        assertFalse(hasSlot(remaining, "08:00"));
        assertFalse(hasSlot(remaining, "09:00"));
        assertFalse(hasSlot(remaining, "10:00"));
        assertFalse(hasSlot(remaining, "11:00"));
        assertFalse(hasSlot(remaining, "12:00"));
        assertTrue(hasSlot(remaining, "13:00"));
    }

    @Test
    void existingItabiritoBookingBlocksNearbyDistantCitySlot() throws IOException {
        Fixture fixture = new Fixture();
        LocalDate date = nextAvailableDate(fixture.calendar, fixture.props);

        fixture.calendar.createEvent(confirmedBooking(date, LocalTime.of(9, 0)));

        List<AvailableSlotResponse> distantSlots = fixture.useCase.execute(date, "Belo Horizonte", fixture.props.getBookingSlotMinutes());

        assertFalse(hasSlot(distantSlots, "10:00"));
    }

    @Test
    void emptyDistantCityDayStartsThreeHoursAfterNormalFirstSlot() throws IOException {
        Fixture fixture = new Fixture();
        LocalDate date = nextAvailableDate(fixture.calendar, fixture.props);

        List<AvailableSlotResponse> slots = fixture.useCase.execute(date, "Belo Horizonte", fixture.props.getBookingSlotMinutes());

        assertFalse(slots.isEmpty());
        assertEquals("11:00", slots.get(0).getStartTime());
    }

    @Test
    void manualAvailabilityBlockRemovesSlot() throws IOException {
        Fixture fixture = new Fixture();
        AvailabilityBlockService blocks = new AvailabilityBlockService(
                fixture.calendar,
                fixture.props,
                new AdminBookingOpsService(fixture.calendar, new InMemoryPendingStore(), fixture.props));
        LocalDate date = nextAvailableDate(fixture.calendar, fixture.props);
        AvailableSlotResponse blockedSlot = fixture.useCase.execute(date, "Itabirito", fixture.props.getBookingSlotMinutes()).get(0);
        LocalDateTime blockedStart = LocalDateTime.of(date, LocalTime.parse(blockedSlot.getStartTime()));

        AvailabilityBlockCreateRequest request = new AvailabilityBlockCreateRequest();
        request.setMode("BLOCK");
        request.setType("SLOT");
        request.setStartAt(blockedStart);
        request.setEndAt(blockedStart.plusMinutes(fixture.props.getBookingSlotMinutes()));
        request.setReason("Manutencao interna");
        blocks.create(request);

        List<AvailableSlotResponse> remaining = fixture.useCase.execute(date, "Itabirito", fixture.props.getBookingSlotMinutes());

        assertFalse(remaining.stream().anyMatch(slot -> blockedSlot.getStartTime().equals(slot.getStartTime())));
    }

    private static LocalDate nextAvailableDate(DummyCalendarClient calendar, AppProperties props) throws IOException {
        AvailabilityPolicyService policy = new AvailabilityPolicyService(calendar, props);
        LocalDate today = LocalDate.now(ZONE);
        YearMonth current = YearMonth.from(today);
        YearMonth next = current.plusMonths(1);
        for (int offset = 2; offset <= 45; offset++) {
            LocalDate candidate = today.plusDays(offset);
            YearMonth candidateMonth = YearMonth.from(candidate);
            if ((candidateMonth.equals(current) || candidateMonth.equals(next)) && policy.hasAnyAvailability(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("No available test date in booking window");
    }

    private static Servico confirmedBooking(LocalDate date, LocalTime time) {
        ZonedDateTime start = ZonedDateTime.of(date, time, ZONE);
        Servico servico = new Servico();
        servico.setTitle("Visita tecnica");
        servico.setDescription("Atendimento confirmado para ocupar agenda");
        servico.setServiceNotes("Atendimento confirmado para ocupar agenda");
        servico.setStart(start.toInstant());
        servico.setEnd(start.plusHours(1).toInstant());
        servico.setAppointmentStart(start.toInstant());
        servico.setAppointmentEnd(start.plusHours(1).toInstant());
        servico.setStatus("CONFIRMED");
        servico.setClientFirstName("Maria");
        servico.setClientLastName("Souza");
        servico.setClientEmail("maria@example.com");
        servico.setClientPhone("31988888888");
        servico.setClientCep("35450000");
        servico.setClientStreet("Rua Um");
        servico.setClientNeighborhood("Centro");
        servico.setClientNumber("10");
        servico.setClientCity("Itabirito");
        servico.setClientState("MG");
        return servico;
    }

    private static Servico distantBooking(LocalDate date, LocalTime appointmentTime) {
        ZonedDateTime appointmentStart = ZonedDateTime.of(date, appointmentTime, ZONE);
        ZonedDateTime blockStart = appointmentStart.minusHours(2);
        Servico servico = confirmedBooking(date, appointmentTime);
        servico.setStart(blockStart.toInstant());
        servico.setEnd(appointmentStart.plusHours(3).toInstant());
        servico.setAppointmentStart(appointmentStart.toInstant());
        servico.setAppointmentEnd(appointmentStart.plusHours(1).toInstant());
        servico.setClientCity("Belo Horizonte");
        return servico;
    }

    private static boolean hasSlot(List<AvailableSlotResponse> slots, String time) {
        return slots.stream().anyMatch(slot -> time.equals(slot.getStartTime()));
    }

    private static class Fixture {
        private final AppProperties props = new AppProperties();
        private final DummyCalendarClient calendar = new DummyCalendarClient();
        private final InMemoryPendingStore pendingStore = new InMemoryPendingStore();
        private final GetAvailableSlotsUseCase useCase = new GetAvailableSlotsUseCase(
                calendar,
                pendingStore,
                props,
                new AvailabilityPolicyService(calendar, props));
    }
}
