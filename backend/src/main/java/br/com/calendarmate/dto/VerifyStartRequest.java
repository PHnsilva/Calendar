package br.com.calendarmate.dto;

import jakarta.validation.constraints.NotBlank;

public class VerifyStartRequest {

    @NotBlank
    private String token;

    // usuário pode editar no modal
    @NotBlank
    private String phone;

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
}
