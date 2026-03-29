package br.com.calendarmate.dto;

public class RecoverStartResponse {
    private String verificationId;
    private long expiresInSeconds;
    private long resendAfterSeconds;

    public RecoverStartResponse() {}

    public RecoverStartResponse(String verificationId, long expiresInSeconds, long resendAfterSeconds) {
        this.verificationId = verificationId;
        this.expiresInSeconds = expiresInSeconds;
        this.resendAfterSeconds = resendAfterSeconds;
    }

    public String getVerificationId() { return verificationId; }
    public void setVerificationId(String verificationId) { this.verificationId = verificationId; }

    public long getExpiresInSeconds() { return expiresInSeconds; }
    public void setExpiresInSeconds(long expiresInSeconds) { this.expiresInSeconds = expiresInSeconds; }

    public long getResendAfterSeconds() { return resendAfterSeconds; }
    public void setResendAfterSeconds(long resendAfterSeconds) { this.resendAfterSeconds = resendAfterSeconds; }
}