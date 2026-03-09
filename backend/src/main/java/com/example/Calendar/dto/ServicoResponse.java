package com.example.Calendar.dto;

import java.time.Instant;

public class ServicoResponse {
    private String eventId;
    private String eventLink;

    private String serviceType;
    private Instant start;
    private Instant end;

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

    private String clientAddressLine;
    private String status;

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public String getEventLink() { return eventLink; }
    public void setEventLink(String eventLink) { this.eventLink = eventLink; }

    public String getServiceType() { return serviceType; }
    public void setServiceType(String serviceType) { this.serviceType = serviceType; }

    public Instant getStart() { return start; }
    public void setStart(Instant start) { this.start = start; }

    public Instant getEnd() { return end; }
    public void setEnd(Instant end) { this.end = end; }

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

    public String getClientAddressLine() { return clientAddressLine; }
    public void setClientAddressLine(String clientAddressLine) { this.clientAddressLine = clientAddressLine; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}