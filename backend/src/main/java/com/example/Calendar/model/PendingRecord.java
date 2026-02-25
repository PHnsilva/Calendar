package com.example.Calendar.model;

public class PendingRecord {
    private String eventId;
    private String phoneDigits;
    private long pendingExpiresAtEpochSec;
    private long createdAtEpochSec;

    public PendingRecord() {}

    public PendingRecord(String eventId, String phoneDigits, long pendingExpiresAtEpochSec, long createdAtEpochSec) {
        this.eventId = eventId;
        this.phoneDigits = phoneDigits;
        this.pendingExpiresAtEpochSec = pendingExpiresAtEpochSec;
        this.createdAtEpochSec = createdAtEpochSec;
    }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public String getPhoneDigits() { return phoneDigits; }
    public void setPhoneDigits(String phoneDigits) { this.phoneDigits = phoneDigits; }

    public long getPendingExpiresAtEpochSec() { return pendingExpiresAtEpochSec; }
    public void setPendingExpiresAtEpochSec(long pendingExpiresAtEpochSec) { this.pendingExpiresAtEpochSec = pendingExpiresAtEpochSec; }

    public long getCreatedAtEpochSec() { return createdAtEpochSec; }
    public void setCreatedAtEpochSec(long createdAtEpochSec) { this.createdAtEpochSec = createdAtEpochSec; }

    public boolean isExpired(long nowEpochSec) {
        return pendingExpiresAtEpochSec > 0 && nowEpochSec > pendingExpiresAtEpochSec;
    }
}