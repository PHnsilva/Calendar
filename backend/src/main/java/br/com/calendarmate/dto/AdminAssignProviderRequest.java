package br.com.calendarmate.dto;

import jakarta.validation.constraints.NotBlank;

public class AdminAssignProviderRequest {
    @NotBlank
    private String providerId;

    public String getProviderId() { return providerId; }
    public void setProviderId(String providerId) { this.providerId = providerId; }
}
