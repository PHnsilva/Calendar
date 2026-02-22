package com.example.Calendar.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class VerifyStartRequest {

    @NotBlank
    private String token;

    // usuário pode editar no modal
    @NotBlank
    @Pattern(regexp = "^\\D*(\\d\\D*){10,11}$", message = "telefone deve ter 10 ou 11 dígitos")
    private String phone;

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
}