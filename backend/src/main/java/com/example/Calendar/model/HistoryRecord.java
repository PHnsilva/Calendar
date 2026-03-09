package com.example.Calendar.model;

public class HistoryRecord {
    private String id;
    private String type; // "VERIFY_START", "VERIFY_CONFIRM", "RECOVER_START", "RECOVER_CONFIRM" etc.
    private String phoneDigits;
    private String eventId;
    private long createdAtEpochSec;
    private String meta; // json string simples (opcional)

    public HistoryRecord() {}

    public HistoryRecord(String id, String type, String phoneDigits, String eventId, long createdAtEpochSec, String meta) {
        this.id = id;
        this.type = type;
        this.phoneDigits = phoneDigits;
        this.eventId = eventId;
        this.createdAtEpochSec = createdAtEpochSec;
        this.meta = meta;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getPhoneDigits() { return phoneDigits; }
    public void setPhoneDigits(String phoneDigits) { this.phoneDigits = phoneDigits; }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public long getCreatedAtEpochSec() { return createdAtEpochSec; }
    public void setCreatedAtEpochSec(long createdAtEpochSec) { this.createdAtEpochSec = createdAtEpochSec; }

    public String getMeta() { return meta; }
    public void setMeta(String meta) { this.meta = meta; }
}