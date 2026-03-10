package com.example.Calendar.google;

import com.example.Calendar.model.Servico;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.TimePeriod;
import java.time.Instant;
import java.io.IOException;
import java.util.List;

public interface CalendarClient {
    Event createEvent(Servico s) throws IOException;
    Event updateEvent(Servico s) throws IOException;
    void deleteEvent(String eventId) throws IOException;

    Event getEvent(String eventId) throws IOException;
    Event createAvailabilityBlockEvent(String blockType, Instant start, Instant end, String reason) throws IOException;

    // todos os eventos do sistema (bookings + futuros blocks)
    List<Event> listEvents(DateTime timeMin, DateTime timeMax) throws IOException;

    // somente agendamentos
    List<Event> listBookingEvents(DateTime timeMin, DateTime timeMax) throws IOException;

    // somente bloqueios manuais
    List<Event> listAvailabilityBlockEvents(DateTime timeMin, DateTime timeMax) throws IOException;

    // somente agendamentos do telefone informado
    List<Event> listEventsByPhone(DateTime timeMin, DateTime timeMax, String phoneDigits) throws IOException;

    List<TimePeriod> freeBusy(DateTime timeMin, DateTime timeMax) throws IOException;
}