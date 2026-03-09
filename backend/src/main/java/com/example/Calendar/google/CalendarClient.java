package com.example.Calendar.google;

import com.example.Calendar.model.Servico;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.TimePeriod;

import java.io.IOException;
import java.util.List;

public interface CalendarClient {
    Event createEvent(Servico s) throws IOException;
    Event updateEvent(Servico s) throws IOException;
    void deleteEvent(String eventId) throws IOException;

    Event getEvent(String eventId) throws IOException;


    List<Event> listEvents(DateTime timeMin, DateTime timeMax) throws IOException;
    
    List<Event> listEventsByPhone(DateTime timeMin, DateTime timeMax, String phoneDigits) throws IOException;

    List<TimePeriod> freeBusy(DateTime timeMin, DateTime timeMax) throws IOException;
}