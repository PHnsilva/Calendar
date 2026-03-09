package com.example.Calendar.dto;

import java.time.Instant;

public class ServicoCreateResponse {
    private ServicoResponse servico;
    private String manageToken;

    private String verificationId;
    private long expiresInSeconds;
    private long resendAfterSeconds;
    private Instant pendingExpiresAt;

    public ServicoResponse getServico() { return servico; }
    public void setServico(ServicoResponse servico) { this.servico = servico; }

    public String getManageToken() { return manageToken; }
    public void setManageToken(String manageToken) { this.manageToken = manageToken; }

    public String getVerificationId() { return verificationId; }
    public void setVerificationId(String verificationId) { this.verificationId = verificationId; }

    public long getExpiresInSeconds() { return expiresInSeconds; }
    public void setExpiresInSeconds(long expiresInSeconds) { this.expiresInSeconds = expiresInSeconds; }

    public long getResendAfterSeconds() { return resendAfterSeconds; }
    public void setResendAfterSeconds(long resendAfterSeconds) { this.resendAfterSeconds = resendAfterSeconds; }

    public Instant getPendingExpiresAt() { return pendingExpiresAt; }
    public void setPendingExpiresAt(Instant pendingExpiresAt) { this.pendingExpiresAt = pendingExpiresAt; }
}