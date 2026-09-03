package br.com.calendarmate.google;

import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.Events;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GoogleCalendarClientPaginationTest {
    @Test
    void followsEveryGoogleCalendarEventPage() throws Exception {
        Calendar service = mock(Calendar.class);
        Calendar.Events eventsResource = mock(Calendar.Events.class);
        Calendar.Events.List request = mock(Calendar.Events.List.class);
        when(service.events()).thenReturn(eventsResource);
        when(eventsResource.list("primary")).thenReturn(request);
        when(request.setTimeMin(any())).thenReturn(request);
        when(request.setTimeMax(any())).thenReturn(request);
        when(request.setOrderBy("startTime")).thenReturn(request);
        when(request.setSingleEvents(true)).thenReturn(request);
        when(request.setShowDeleted(false)).thenReturn(request);
        when(request.setFields(any())).thenReturn(request);
        when(request.setPageToken("page-2")).thenReturn(request);

        Events firstPage = new Events().setItems(List.of(systemBooking("booking-1"))).setNextPageToken("page-2");
        Events secondPage = new Events().setItems(List.of(systemBooking("booking-2")));
        when(request.execute()).thenReturn(firstPage, secondPage);

        GoogleCalendarClient client = new GoogleCalendarClient(service, "primary");
        List<Event> result = client.listBookingEvents(new DateTime(0), new DateTime(10_000));

        assertEquals(List.of("booking-1", "booking-2"), result.stream().map(Event::getId).toList());
        verify(request).setPageToken("page-2");
        verify(request, times(2)).execute();
    }

    private static Event systemBooking(String id) {
        return new Event()
                .setId(id)
                .setExtendedProperties(new Event.ExtendedProperties().setPrivate(Map.of(
                        "appSource", "calendar-backend",
                        "entityType", "booking")));
    }
}
