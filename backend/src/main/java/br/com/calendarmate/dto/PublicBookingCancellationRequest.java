package br.com.calendarmate.dto;

import jakarta.validation.constraints.NotBlank;

public class PublicBookingCancellationRequest {
    @NotBlank
    private String eventId;

    @NotBlank
    private String phone;

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
}
