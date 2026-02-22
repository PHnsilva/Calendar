package com.example.Calendar.dto;

public class VerifyConfirmResponse {
    private boolean verified;

    public VerifyConfirmResponse(boolean verified) {
        this.verified = verified;
    }

    public boolean isVerified() { return verified; }
}