package br.com.calendarmate.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class RecoverConfirmRequest {

    @NotBlank
    private String verificationId;

    @NotBlank
    @Pattern(regexp = "^\\d{3}$", message = "código deve ter 3 dígitos")
    private String code;

    public String getVerificationId() { return verificationId; }
    public void setVerificationId(String verificationId) { this.verificationId = verificationId; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}