package br.com.calendarmate.dto;

import java.time.Instant;

/** The deliberately narrow response exposed by the phone-only customer flow. */
public class PublicBookingResponse {
    private String eventId;
    private String serviceType;
    private Instant start;
    private String status;

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }
    public String getServiceType() { return serviceType; }
    public void setServiceType(String serviceType) { this.serviceType = serviceType; }
    public Instant getStart() { return start; }
    public void setStart(Instant start) { this.start = start; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
