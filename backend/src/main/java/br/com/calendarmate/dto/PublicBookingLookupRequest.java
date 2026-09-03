package br.com.calendarmate.dto;

import jakarta.validation.constraints.NotBlank;

public class PublicBookingLookupRequest {
    @NotBlank
    private String phone;

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
}
