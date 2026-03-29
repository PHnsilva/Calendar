package br.com.calendarmate.google;

import br.com.calendarmate.model.Servico;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.TimePeriod;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

public interface CalendarClient {
    Event createEvent(Servico s) throws IOException;
    Event updateEvent(Servico s) throws IOException;
    void deleteEvent(String eventId) throws IOException;

    Event getEvent(String eventId) throws IOException;

    List<Event> listEvents(DateTime timeMin, DateTime timeMax) throws IOException;
    List<Event> listBookingEvents(DateTime timeMin, DateTime timeMax) throws IOException;
    List<Event> listAvailabilityRuleEvents(DateTime timeMin, DateTime timeMax) throws IOException;
    List<Event> listEventsByPhone(DateTime timeMin, DateTime timeMax, String phoneDigits) throws IOException;

    Event createAvailabilityRuleEvent(String mode, String type, Instant start, Instant end, String reason) throws IOException;

    List<TimePeriod> freeBusy(DateTime timeMin, DateTime timeMax) throws IOException;
}