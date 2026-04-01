package br.com.calendarmate.model;

import java.time.Instant;

public class Servico {
    private String id;

    private String title;
    private String description;

    private Instant start;
    private Instant end;

    private Instant phoneVerifiedAt;

    private String clientFirstName;
    private String clientLastName;
    private String clientEmail;
    private String clientPhone;

    private String clientCep;
    private String clientStreet;
    private String clientNeighborhood;
    private String clientNumber;
    private String clientComplement;
    private String clientCity;
    private String clientState;

    private String eventId;

    private String status; // PENDING_PHONE / CONFIRMED etc
    private Instant pendingExpiresAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Instant getStart() { return start; }
    public void setStart(Instant start) { this.start = start; }

    public Instant getEnd() { return end; }
    public void setEnd(Instant end) { this.end = end; }

    public Instant getPhoneVerifiedAt() { return phoneVerifiedAt; }
    public void setPhoneVerifiedAt(Instant phoneVerifiedAt) { this.phoneVerifiedAt = phoneVerifiedAt; }

    public String getClientFirstName() { return clientFirstName; }
    public void setClientFirstName(String clientFirstName) { this.clientFirstName = clientFirstName; }

    public String getClientLastName() { return clientLastName; }
    public void setClientLastName(String clientLastName) { this.clientLastName = clientLastName; }

    public String getClientEmail() { return clientEmail; }
    public void setClientEmail(String clientEmail) { this.clientEmail = clientEmail; }

    public String getClientPhone() { return clientPhone; }
    public void setClientPhone(String clientPhone) { this.clientPhone = clientPhone; }

    public String getClientCep() { return clientCep; }
    public void setClientCep(String clientCep) { this.clientCep = clientCep; }

    public String getClientStreet() { return clientStreet; }
    public void setClientStreet(String clientStreet) { this.clientStreet = clientStreet; }

    public String getClientNeighborhood() { return clientNeighborhood; }
    public void setClientNeighborhood(String clientNeighborhood) { this.clientNeighborhood = clientNeighborhood; }

    public String getClientNumber() { return clientNumber; }
    public void setClientNumber(String clientNumber) { this.clientNumber = clientNumber; }

    public String getClientComplement() { return clientComplement; }
    public void setClientComplement(String clientComplement) { this.clientComplement = clientComplement; }

    public String getClientCity() { return clientCity; }
    public void setClientCity(String clientCity) { this.clientCity = clientCity; }

    public String getClientState() { return clientState; }
    public void setClientState(String clientState) { this.clientState = clientState; }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getPendingExpiresAt() { return pendingExpiresAt; }
    public void setPendingExpiresAt(Instant pendingExpiresAt) { this.pendingExpiresAt = pendingExpiresAt; }
}