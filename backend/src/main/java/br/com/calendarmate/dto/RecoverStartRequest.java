package br.com.calendarmate.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class RecoverStartRequest {

    @NotBlank
    @Pattern(regexp = "^\\D*(\\d\\D*){10,11}$", message = "telefone deve ter 10 ou 11 dígitos")
    private String phone;

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
}