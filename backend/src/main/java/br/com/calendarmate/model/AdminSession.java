package br.com.calendarmate.model;

public class AdminSession {
    private String sessionId;
    private String adminUserId;
    private String tokenHash;
    private long createdAtEpochSec;
    private long expiresAtEpochSec;
    private long lastSeenAtEpochSec;
    private Long revokedAtEpochSec;

    public AdminSession() {
    }

    public AdminSession(String sessionId, String adminUserId, String tokenHash, long createdAtEpochSec, long expiresAtEpochSec, long lastSeenAtEpochSec, Long revokedAtEpochSec) {
        this.sessionId = sessionId;
        this.adminUserId = adminUserId;
        this.tokenHash = tokenHash;
        this.createdAtEpochSec = createdAtEpochSec;
        this.expiresAtEpochSec = expiresAtEpochSec;
        this.lastSeenAtEpochSec = lastSeenAtEpochSec;
        this.revokedAtEpochSec = revokedAtEpochSec;
    }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getAdminUserId() { return adminUserId; }
    public void setAdminUserId(String adminUserId) { this.adminUserId = adminUserId; }

    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }

    public long getCreatedAtEpochSec() { return createdAtEpochSec; }
    public void setCreatedAtEpochSec(long createdAtEpochSec) { this.createdAtEpochSec = createdAtEpochSec; }

    public long getExpiresAtEpochSec() { return expiresAtEpochSec; }
    public void setExpiresAtEpochSec(long expiresAtEpochSec) { this.expiresAtEpochSec = expiresAtEpochSec; }

    public long getLastSeenAtEpochSec() { return lastSeenAtEpochSec; }
    public void setLastSeenAtEpochSec(long lastSeenAtEpochSec) { this.lastSeenAtEpochSec = lastSeenAtEpochSec; }

    public Long getRevokedAtEpochSec() { return revokedAtEpochSec; }
    public void setRevokedAtEpochSec(Long revokedAtEpochSec) { this.revokedAtEpochSec = revokedAtEpochSec; }

    public boolean isActive(long nowEpochSec) {
        return revokedAtEpochSec == null && expiresAtEpochSec >= nowEpochSec;
    }
}
