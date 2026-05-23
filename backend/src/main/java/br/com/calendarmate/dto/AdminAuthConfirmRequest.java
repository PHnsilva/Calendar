package br.com.calendarmate.dto;

import jakarta.validation.constraints.NotBlank;

public class AdminAuthConfirmRequest {
    @NotBlank
    private String verificationId;

    @NotBlank
    private String code;

    public String getVerificationId() { return verificationId; }
    public void setVerificationId(String verificationId) { this.verificationId = verificationId; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}
