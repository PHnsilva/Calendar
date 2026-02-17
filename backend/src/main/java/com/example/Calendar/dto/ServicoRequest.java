package com.example.Calendar.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public class ServicoRequest {

    @NotBlank
    private String serviceType;

    @NotNull
    private LocalDate date;

    @NotNull
    private LocalTime time;

    @NotBlank
    private String clientFirstName;

    @NotBlank
    private String clientLastName;

    @Email
    @NotBlank
    private String clientEmail;

    @NotBlank
    private String clientPhone;

    @NotBlank
    private String clientAddress;

    // getters

    public String getServiceType() { return serviceType; }
    public LocalDate getDate() { return date; }
    public LocalTime getTime() { return time; }
    public String getClientFirstName() { return clientFirstName; }
    public String getClientLastName() { return clientLastName; }
    public String getClientEmail() { return clientEmail; }
    public String getClientPhone() { return clientPhone; }
    public String getClientAddress() { return clientAddress; }

    // setters

    public void setServiceType(String serviceType) { this.serviceType = serviceType; }
    public void setDate(LocalDate date) { this.date = date; }
    public void setTime(LocalTime time) { this.time = time; }
    public void setClientFirstName(String clientFirstName) { this.clientFirstName = clientFirstName; }
    public void setClientLastName(String clientLastName) { this.clientLastName = clientLastName; }
    public void setClientEmail(String clientEmail) { this.clientEmail = clientEmail; }
    public void setClientPhone(String clientPhone) { this.clientPhone = clientPhone; }
    public void setClientAddress(String clientAddress) { this.clientAddress = clientAddress; }
}
