package com.example.Calendar.dto;

public class VerifyStartResponse {
    private String verificationId;
    private long expiresInSeconds;
    private long resendAfterSeconds;

    public VerifyStartResponse(String verificationId, long expiresInSeconds, long resendAfterSeconds) {
        this.verificationId = verificationId;
        this.expiresInSeconds = expiresInSeconds;
        this.resendAfterSeconds = resendAfterSeconds;
    }

    public String getVerificationId() { return verificationId; }
    public long getExpiresInSeconds() { return expiresInSeconds; }
    public long getResendAfterSeconds() { return resendAfterSeconds; }
}