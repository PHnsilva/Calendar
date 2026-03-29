package br.com.calendarmate.dto;

import jakarta.validation.constraints.NotBlank;

public class RecoverResendRequest {

    @NotBlank
    private String verificationId;

    public String getVerificationId() {
        return verificationId;
    }

    public void setVerificationId(String verificationId) {
        this.verificationId = verificationId;
    }
}
