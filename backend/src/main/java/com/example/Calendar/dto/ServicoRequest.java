package com.example.Calendar.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.time.LocalTime;

public class ServicoRequest {

    @NotBlank
    private String serviceType;

    @NotNull
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;

    @NotNull
    @JsonFormat(pattern = "HH:mm")
    private LocalTime time;

    @NotBlank
    private String clientFirstName;

    @NotBlank
    private String clientLastName;

    @Email(message = "email inválido")
    private String clientEmail;

    @NotBlank
    private String clientPhone;

    @NotBlank
    @Pattern(regexp = "^\\d{8}$", message = "CEP deve ter 8 dígitos (somente números)")
    private String clientCep;

    @NotBlank
    private String clientStreet;

    @NotBlank
    private String clientNeighborhood;

    @NotBlank
    private String clientNumber;

    private String clientComplement;

    @NotBlank
    private String clientCity;

    @NotBlank
    @Size(min = 2, max = 2, message = "UF deve ter 2 letras")
    private String clientState;

    public String getServiceType() { return serviceType; }
    public void setServiceType(String serviceType) { this.serviceType = serviceType; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public LocalTime getTime() { return time; }
    public void setTime(LocalTime time) { this.time = time; }

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
}