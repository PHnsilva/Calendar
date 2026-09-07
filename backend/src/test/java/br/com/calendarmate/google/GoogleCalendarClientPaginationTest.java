package br.com.calendarmate.google;

import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.Events;
import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GoogleCalendarClientPaginationTest {
    @Test
    void cancellationUsesPutAndPreservesTheExistingCalendarEvent() throws Exception {
        Calendar service = mock(Calendar.class);
        Calendar.Events eventsResource = mock(Calendar.Events.class);
        Calendar.Events.Get getRequest = mock(Calendar.Events.Get.class);
        Calendar.Events.Update updateRequest = mock(Calendar.Events.Update.class);
        Event existing = systemBooking("booking-1")
                .setSummary("Tomada (Confirmado)")
                .setDescription("Não tocar nas observações")
                .setLocation("Rua preservada, 123");
        existing.getExtendedProperties().getPrivate().put("serviceType", "Tomada");
        Event updated = systemBooking("booking-1");
        ArgumentCaptor<Event> body = ArgumentCaptor.forClass(Event.class);

        when(service.events()).thenReturn(eventsResource);
        when(eventsResource.get("primary", "booking-1")).thenReturn(getRequest);
        when(getRequest.execute()).thenReturn(existing);
        when(eventsResource.update(eq("primary"), eq("booking-1"), body.capture())).thenReturn(updateRequest);
        when(updateRequest.setSendUpdates("all")).thenReturn(updateRequest);
        when(updateRequest.execute()).thenReturn(updated);

        Instant cancelledAt = Instant.parse("2026-09-04T04:30:00Z");
        GoogleCalendarClient client = new GoogleCalendarClient(service, "primary");
        Event result = client.cancelEvent("booking-1", cancelledAt, "CUSTOMER_PHONE_LOOKUP");

        assertEquals(updated, result);
        assertSame(existing, body.getValue());
        assertEquals("Tomada (Cancelado)", body.getValue().getSummary());
        assertEquals("transparent", body.getValue().getTransparency());
        assertEquals("CANCELLED", body.getValue().getExtendedProperties().getPrivate().get("status"));
        assertEquals(cancelledAt.toString(), body.getValue().getExtendedProperties().getPrivate().get("cancellationAt"));
        assertEquals("CUSTOMER_PHONE_LOOKUP", body.getValue().getExtendedProperties().getPrivate().get("cancellationSource"));
        assertEquals("Não tocar nas observações", body.getValue().getDescription());
        assertEquals("Rua preservada, 123", body.getValue().getLocation());
    }

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
                .setExtendedProperties(new Event.ExtendedProperties().setPrivate(new HashMap<>(Map.of(
                        "appSource", "calendar-backend",
                        "entityType", "booking"))));
    }
}
